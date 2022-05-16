// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./JumpRateModelV2.sol";
import "./SafeMath.sol";

/**
  * @title Compound's DAIInterestRateModel Contract (version 3)
  * @author Compound (modified by Dharma Labs)
  * @notice The parameterized model described in section 2.4 of the original Compound Protocol whitepaper.
  * Version 3 modifies the interest rate model in Version 2 by increasing the initial "gap" or slope of
  * the model prior to the "kink" from 2% to 4%, and enabling updateable parameters.
  */
abstract contract DAIInterestRateModelV3 is JumpRateModelV2 {
    using SafeMath for uint;

    /**
     * @notice The additional margin per block separating the base borrow rate from the roof.
     */
    uint public gapPerBlock;

    /**
     * @notice The assumed (1 - reserve factor) used to calculate the minimum borrow rate (reserve factor = 0.05)
     */
    uint public constant assumedOneMinusReserveFactorMantissa = 0.95e18;

    PotLike pot;
    JugLike jug;

    /**
     * @notice Construct an interest rate model
     * @param jumpMultiplierPerYear The multiplierPerBlock after hitting a specified utilization point
     * @param kink_ The utilization point at which the jump multiplier is applied
     * @param pot_ The address of the Dai pot (where DSR is earned)
     * @param jug_ The address of the Dai jug (where SF is kept)
     * @param owner_ The address of the owner, i.e. the Timelock contract (which has the ability to update parameters directly)
     */
    constructor(uint jumpMultiplierPerYear, uint kink_, address pot_, address jug_, address owner_) JumpRateModelV2(0, 0, jumpMultiplierPerYear, kink_, owner_) {
        gapPerBlock = 4e16 / blocksPerYear;
        pot = PotLike(pot_);
        jug = JugLike(jug_);
        poke();
    }

    /**
     * @notice External function to update the parameters of the interest rate model
     * @param baseRatePerYear The approximate target base APR, as a mantissa (scaled by 1e18). For DAI, this is calculated from DSR and SF. Input not used.
     * @param gapPerYear The Additional margin per year separating the base borrow rate from the roof. (scaled by 1e18)
     * @param jumpMultiplierPerYear The jumpMultiplierPerYear after hitting a specified utilization point
     * @param kink_ The utilization point at which the jump multiplier is applied
     */
    function updateJumpRateModel(uint baseRatePerYear, uint gapPerYear, uint jumpMultiplierPerYear, uint kink_) external override {
        require(msg.sender == owner, "only the owner may call this function.");
        gapPerBlock = gapPerYear / blocksPerYear;
        updateJumpRateModelInternal(0, 0, jumpMultiplierPerYear, kink_);
        poke();
    }

    /**
     * @notice Calculates the current supply interest rate per block including the Dai savings rate
     * @param cash The total amount of cash the market has
     * @param borrows The total amount of borrows the market has outstanding
     * @param reserves The total amnount of reserves the market has
     * @param reserveFactorMantissa The current reserve factor the market has
     * @return The supply rate per block (as a percentage, and scaled by 1e18) "BaseJumpRateModelV2" and "InterestRateModel"
     */
    function getSupplyRate(uint cash, uint borrows, uint reserves, uint reserveFactorMantissa) public view override(BaseJumpRateModelV2,InterestRateModel) returns (uint) {
        uint protocolRate = super.getSupplyRate(cash, borrows, reserves, reserveFactorMantissa);

        uint underlying = cash+(borrows)-(reserves);
        if (underlying == 0) {
            return protocolRate;
        } else {
            uint cashRate = cash*(dsrPerBlock())/(underlying);
            return cashRate+(protocolRate);
        }
    }

    /**
     * @notice Calculates the Dai savings rate per block
     * @return The Dai savings rate per block (as a percentage, and scaled by 1e18)
     */
    function dsrPerBlock() public view returns (uint) {
        return pot
            .dsr()-(1e27)  // scaled 1e27 aka RAY, and includes an extra "ONE" before subraction
            /(1e9) // descale to 1e18
            *(15); // 15 seconds per block
    }

    /**
     * @notice Resets the baseRate and multiplier per block based on the stability fee and Dai savings rate
     */
    function poke() public {
        (uint duty, ) = jug.ilks("ETH-A");
        uint stabilityFeePerBlock = duty+(jug.base())-(1e27)*(1e18)/(1e27)*(15);

        // We ensure the minimum borrow rate >= DSR / (1 - reserve factor)
        baseRatePerBlock = dsrPerBlock()*(1e18)/(assumedOneMinusReserveFactorMantissa);

        // The roof borrow rate is max(base rate, stability fee) + gap, from which we derive the slope
        if (baseRatePerBlock < stabilityFeePerBlock) {
            multiplierPerBlock = stabilityFeePerBlock-(baseRatePerBlock)+(gapPerBlock)*(1e18)/(kink);
        } else {
            multiplierPerBlock = gapPerBlock*(1e18)/(kink);
        }

        emit NewInterestParams(baseRatePerBlock, multiplierPerBlock, jumpMultiplierPerBlock, kink);
    }
}


/*** Maker Interfaces ***/

abstract contract PotLike {
    function chi() external view virtual returns (uint);
    function dsr() external view virtual returns (uint);
    function rho() external view virtual returns (uint);
    function pie(address) external view virtual returns (uint);
    function drip() external virtual returns (uint);
    function join(uint) external virtual;
    function exit(uint) external virtual;
}

contract JugLike {
    // --- Data ---
    struct Ilk {
        uint256 duty;
        uint256  rho;
    }

   mapping (bytes32 => Ilk) public ilks;
   uint256 public base;
}
