pragma solidity ^0.5.12;

import "./JumpRateModel.sol";
import "./SafeMath.sol";

/**
  * @title Compound's DAIInterestRateModel Contract
  * @author Compound
  * @notice The parameterized model described in section 2.4 of the original Compound Protocol whitepaper
  */
contract DAIInterestRateModel is JumpRateModel {
    using SafeMath for uint;

    PotLike pot;
    JugLike jug;

    /**
     * @notice Construct an interest rate model
     * @param _pot The approximate target base APR, as a mantissa (scaled by 1e18)
     * @param _jug The rate of increase in interest rate wrt utilization (scaled by 1e18)
     * @param _kink The utilization point at which an additional multiplier is applied
     * @param _jump The additional multiplier to be applied to multiplierPerBlock after hitting a specified utilization point
     */
    constructor(address _pot, address _jug, uint _kink, uint _jump) JumpRateModel(0, 0, _kink, _jump) public {
        pot = PotLike(_pot);
        jug = JugLike(_jug);
        poke();
    }

    /**
     * @notice Calculates the current supply interest rate per block including the Dai savings rate
     * @param cash The total amount of cash the market has
     * @param borrows The total amount of borrows the market has outstanding
     * @param reserves The total amnount of reserves the market has
     * @param reserveFactorMantissa The current reserve factor the market has
     * @return The supply rate per block (as a percentage, and scaled by 1e18)
     */
    function getSupplyRate(uint cash, uint borrows, uint reserves, uint reserveFactorMantissa) public view returns (uint) {
        uint protocolRate = super.getSupplyRate(cash, borrows, reserves, reserveFactorMantissa);

        uint underlying = cash.add(borrows).sub(reserves);
        if (underlying == 0) {
            return protocolRate;
        } else {
            uint cashRate = cash.mul(dsrPerBlock()).div(underlying);
            return cashRate.add(protocolRate);
        }
    }

    /**
     * @notice Calculates the Dai savings rate per block
     * @return The Dai savings rate per block (as a percentage, and scaled by 1e18)
     */
    function dsrPerBlock() public view returns (uint) {
        return pot
            .dsr().sub(1e27)  // scaled 1e27 aka RAY, and includes an extra "ONE" before subraction
            .div(1e9) // descale to 1e18
            .mul(15); // 15 seconds per block
    }


    /**
     * @notice Resets the baseRate and multiplier per block based on the stability fee and Dai savings rate
     */
    function poke() public {
        (uint duty, ) = jug.ilks("ETH-A");
        uint stabilityFee = duty.add(jug.base()).sub(1e27).mul(1e18).div(1e27).mul(15);

        baseRatePerBlock = dsrPerBlock().mul(1e18).div(0.9e18); // ensure borrow rate is higher than savings rate
        multiplierPerBlock = stabilityFee.sub(baseRatePerBlock).mul(1e18).div(kink);

        emit NewInterestParams(baseRatePerBlock, multiplierPerBlock, kink, jump);
    }
}


/*** Maker Interfaces ***/

contract PotLike {
    function chi() public view returns (uint);
    function dsr() public view returns (uint);
    function rho() public view returns (uint);
    function pie(address) public view returns (uint);
    function drip() public returns (uint);
    function join(uint) public;
    function exit(uint) public;
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

