pragma solidity ^0.5.16;

interface IFuseFeeDistributor {
    function minBorrowEth() external view returns (uint256);
    function maxSupplyEth() external view returns (uint256);
    function maxUtilizationRate() external view returns (uint256);
    function interestFeeRate() external view returns (uint256);
    function comptrollerImplementationWhitelist(address implementation) external view returns (bool);
    function cErc20DelegateWhitelist(address implementation, bool allowResign) external view returns (bool);
    function cEtherDelegateWhitelist(address implementation, bool allowResign) external view returns (bool);
    function latestComptrollerImplementation() external view returns (address);
    function latestCErc20Delegate() external view returns (address latestCErc20Delegate, bool allowResign, bytes memory becomeImplementationData);
    function latestCEtherDelegate() external view returns (address latestCErc20Delegate, bool allowResign, bytes memory becomeImplementationData);
    function deployCEther(bytes memory constructorData) external view returns (address);
    function deployCErc20(bytes memory constructorData) external view returns (address);
    function () external payable;
}
