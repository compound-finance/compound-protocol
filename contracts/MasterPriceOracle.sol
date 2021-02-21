pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./EIP20Interface.sol";
import "./CErc20.sol";

/**
 * @title MasterPriceOracle
 * @notice Use a combination of price oracles.
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract MasterPriceOracle is PriceOracle {
    /**
     * @dev Maps underlying token addresses to `PriceOracle` contracts.
     */
    mapping(address => PriceOracle) oracles;

    /**
     * @dev The administrator of this `MasterPriceOracle`.
     */
    address public admin;

    /**
     * @dev Controls if `admin` can overwrite existing assignments of oracles to underlying tokens.
     */
    bool public canAdminOverwrite;

    /**
     * @dev Constructor to initialize state variables.
     * @param underlyings The underlying ERC20 token addresses to link to `_oracles`.
     * @param _oracles The `PriceOracle` contracts to be assigned to `underlyings`.
     * @param admin The admin who can assign oracles to underlying tokens.
     * @param canAdminOverwrite Controls if `admin` can overwrite existing assignments of oracles to underlying tokens.
     */
    constructor (address[] underlyings, PriceOracle[] _oracles, address admin, bool canAdminOverwrite) public {
        // Input validation
        require(underlyings.length > 0 && underlyings.length == _oracles.length, "Lengths of both arrays must be equal and greater than 0.");

        // Initialize state variables
        for (uint256 i = 0; i < underlyings.length; i++) oracles[underlyings[i]] = _oracles[i];
        admin = _admin;
        canAdminOverwrite = _canAdminOverwrite;
    }

    /**
     * @dev Constructor to map RariFundTokens to RariFundManagers.
     */
    function add(address[] underlyings, PriceOracle[] _oracles) external onlyAdmin {
        // Input validation
        require(underlyings.length > 0 && underlyings.length == _oracles.length, "Lengths of both arrays must be equal and greater than 0.");

        // Assign oracles to underlying tokens
        for (uint256 i = 0; i < underlyings.length; i++) {
            if (!canAdminOverwrite) require(address(oracles[underlyings[i]]) == address(0), "Admin cannot overwrite existing assignments of oracles to underlying tokens.");
            oracles[underlyings[i]] = _oracles[i];
        }
    }

    /**
     * @dev Changes the admin and emits an event.
     */
    function changeAdmin(address newAdmin) external onlyAdmin {
        address oldAdmin = admin;
        admin = newAdmin;
        emit NewAdmin(oldAdmin, newAdmin);
    }

    /**
     * @dev Event emitted when `admin` is changed.
     */
    event NewAdmin(address oldAdmin, address newAdmin);

    /**
     * @dev Modifier that checks if `msg.sender == admin`.
     */
    modifier onlyAdmin {
        require(msg.sender == admin, "Sender is not the admin.");
    }

    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Return 1e18 for ETH
        if (cToken.isCEther()) return 1e18;

        // Get underlying ERC20 token address
        address underlying = address(CErc20(address(cToken)).underlying());

        // Return 1e18 for WETH
        if (underlying == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) return 1e18;

        // Get underlying price from assigned oracle
        return oracles[CErc20(address(cToken)).underlying()].getUnderlyingPrice(cToken);
    }
}
