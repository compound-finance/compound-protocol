pragma solidity ^0.5.16;

interface IFuseFeeDistributor {
    function minBorrowEth() external view returns (uint256);
    function maxSupplyEth() external view returns (uint256);
    function maxUtilizationRate() external view returns (uint256);
    function interestFeeRate() external view returns (uint256);
    function comptrollerImplementationWhitelist(address oldImplementation, address newImplementation) external view returns (bool);
    function cErc20DelegateWhitelist(address oldImplementation, address newImplementation, bool allowResign) external view returns (bool);
    function cEtherDelegateWhitelist(address oldImplementation, address newImplementation, bool allowResign) external view returns (bool);
    function latestComptrollerImplementation(address oldImplementation) external view returns (address);
    function latestCErc20Delegate(address oldImplementation) external view returns (address cErc20Delegate, bool allowResign, bytes memory becomeImplementationData);
    function latestCEtherDelegate(address oldImplementation) external view returns (address cEtherDelegate, bool allowResign, bytes memory becomeImplementationData);
    function deployCEther(bytes calldata constructorData) external returns (address);
    function deployCErc20(bytes calldata constructorData) external returns (address);
    function () external payable;
}
