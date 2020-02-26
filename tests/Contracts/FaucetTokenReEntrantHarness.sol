pragma solidity ^0.5.12;

import "./ERC20NonView.sol";

/**
  * @title The Compound Faucet Re-Entrant Test Token
  * @author Compound
  * @notice A test token that is malicious and tries to re-enter callers
  */
contract FaucetTokenReEntrantHarness is ERC20NonView {
    string public name;
    string public symbol;
    uint8 public decimals;
    bytes public reEntryCallData;
    string public reEntryFun;

    constructor(uint256 _initialAmount, string memory _tokenName, uint8 _decimalUnits, string memory _tokenSymbol, bytes memory _reEntryCallData, string memory _reEntryFun) public {
        _totalSupply = _initialAmount;
        _balances[msg.sender] = _initialAmount;
        name = _tokenName;
        symbol = _tokenSymbol;
        decimals = _decimalUnits;
        reEntryCallData = _reEntryCallData;
        reEntryFun = _reEntryFun;
    }

    modifier reEnter(string memory funName) {
        string memory _reEntryFun = reEntryFun;
        if (compareStrings(_reEntryFun, funName)) {
            reEntryFun = ""; // Clear re-entry fun
            (bool success, bytes memory returndata) = msg.sender.call(reEntryCallData);
            assembly {
                if eq(success, 0) {
                    revert(add(returndata, 0x20), returndatasize)
                }
            }
        }

        _;
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b)));
    }

    /**
      * @dev Arbitrarily adds tokens to any account
      */
    function allocateTo(address _owner, uint256 value) public {
        _balances[_owner] += value;
        _totalSupply += value;
        emit Transfer(address(this), _owner, value);
    }

    function totalSupply() public reEnter("totalSupply") returns (uint256) {
        return super.totalSupply();
    }

    function balanceOf(address owner) public reEnter("balanceOf") returns (uint256 balance) {
        return super.balanceOf(owner);
    }

    function transfer(address dst, uint256 amount) public reEnter("transfer") returns (bool success) {
        return super.transfer(dst, amount);
    }

    function transferFrom(address src, address dst, uint256 amount) public reEnter("transferFrom") returns (bool success) {
        return super.transferFrom(src, dst, amount);
    }

    function approve(address spender, uint256 amount) public reEnter("approve") returns (bool success) {
        return super.approve(spender, amount);
    }

    function allowance(address owner, address spender) public reEnter("allowance") returns (uint256 remaining) {
        return super.allowance(owner, spender);
    }
}
