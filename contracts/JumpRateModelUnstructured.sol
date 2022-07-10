// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./CErc20.sol";
import "./InterestRateModel.sol";


contract JumpRateModelUnstructured is InterestRateModel {


    uint256 private constant BASE = 1e18;

    /**
     * @notice The approximate number of blocks per year that is assumed by the interest rate model
     */
    uint public constant blocksPerYear = 2102400;



    bytes32 private constant multiplierPerBlockPosition = keccak256("org.compound.multiplierPerBlock"); 
    bytes32 private constant baseRatePerBlockPosition = keccak256("org.compound.baseRatePerBlock");
    bytes32 private constant jumpMultiplierPerBlockPosition = keccak256("org.compound.jumpMultiplierPerBlock");
    bytes32 private constant kinkPosition = keccak256("org.compound.kink");



    function initializeInterestRateModel(
                        uint baseRatePerYear_,
                        uint multiplierPerYear_,
                        uint jumpMultiplierPerYear_,
                        uint kink_
                        ) public {

        uint baseRatePerBlock = baseRatePerYear_ / blocksPerYear;
        uint multiplierPerBlock = multiplierPerYear_ / blocksPerYear;
        uint jumpMultiplierPerBlock = jumpMultiplierPerYear_ / blocksPerYear;


        bytes32 baseRatePerBlockPosition_ = baseRatePerBlockPosition;
        bytes32 multiplierPerBlockPosition_ = multiplierPerBlockPosition;
        bytes32 kinkPosition_ = kinkPosition;
        

        assembly {
            sstore(baseRatePerBlockPosition_, baseRatePerBlock)
            sstore(multiplierPerBlockPosition_,  multiplierPerBlock)
            sstore(jumpMultiplierPerBlock, jumpMultiplierPerYear_)
            sstore(kinkPosition_, kink_)
        } 

    }
    

    function multiplierPerBlock() public view returns(uint _multiplierPerBlock) {   
        bytes32 position = multiplierPerBlockPosition;   
        assembly {
            _multiplierPerBlock := sload(position)
        } 
    }


    function baseRatePerBlock() public view returns(uint _baseRatePerBlock) {   
        bytes32 position = baseRatePerBlockPosition;   
        assembly {
            _baseRatePerBlock := sload(position)
        } 
    }
    
    function jumpMultiplierPerBlock() public view returns(uint _jumpMultiplierPerBlock) {   
        bytes32 position = jumpMultiplierPerBlockPosition;   
        assembly {
            _jumpMultiplierPerBlock := sload(position)
        } 
    }

    function kink() public view returns(uint _kink) {   
        bytes32 position = baseRatePerBlockPosition;   
        assembly {
            _kink := sload(position)
        } 
    }


    /**
     * @notice Calculates the utilization rate of the market: `borrows / (cash + borrows - reserves)`
     * @param cash The amount of cash in the market
     * @param borrows The amount of borrows in the market
     * @param reserves The amount of reserves in the market (currently unused)
     * @return The utilization rate as a mantissa between [0, BASE]
     */
    function utilizationRate(uint cash, uint borrows, uint reserves) public pure returns (uint) {
        // Utilization rate is 0 when there are no borrows
        if (borrows == 0) {
            return 0;
        }

        return borrows * BASE / (cash + borrows - reserves);
    }


    /**
     * @notice Calculates the current borrow rate per block, with the error code expected by the market
     * @param cash The amount of cash in the market
     * @param borrows The amount of borrows in the market
     * @param reserves The amount of reserves in the market
     * @return The borrow rate percentage per block as a mantissa (scaled by BASE)
     */
    function getBorrowRate(uint cash, uint borrows, uint reserves) override public view returns (uint) {
        uint util = utilizationRate(cash, borrows, reserves);
     
        if (util <= kink()) {
            return (util * multiplierPerBlock() / BASE) + baseRatePerBlock();
        } else {
            uint normalRate = (kink() * multiplierPerBlock() / BASE) + baseRatePerBlock();
            uint excessUtil = util - kink();
            return (excessUtil * jumpMultiplierPerBlock()/ BASE) + normalRate;
        }
    }

    /**
     * @notice Calculates the current supply rate per block
     * @param cash The amount of cash in the market
     * @param borrows The amount of borrows in the market
     * @param reserves The amount of reserves in the market
     * @param reserveFactorMantissa The current reserve factor for the market
     * @return The supply rate percentage per block as a mantissa (scaled by BASE)
     */
    function getSupplyRate(uint cash, uint borrows, uint reserves, uint reserveFactorMantissa) override public view returns (uint) {
        uint oneMinusReserveFactor = BASE - reserveFactorMantissa;
        uint borrowRate = getBorrowRate(cash, borrows, reserves);
        uint rateToPool = borrowRate * oneMinusReserveFactor / BASE;
        return utilizationRate(cash, borrows, reserves) * rateToPool / BASE;
    }

}
