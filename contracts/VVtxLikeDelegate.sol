pragma solidity ^0.5.16;

import "./VErc20Delegate.sol";

interface VtxLike {
  function delegate(address delegatee) external;
}

/**
 * @title Vortex's VVtxLikeDelegate Contract
 * @notice VTokens which can 'delegate votes' of their underlying ERC-20
 * @author Vortex
 */
contract VVtxLikeDelegate is VErc20Delegate {
  /**
   * @notice Construct an empty delegate
   */
  constructor() public VErc20Delegate() {}

  /**
   * @notice Admin call to delegate the votes of the VTX-like underlying
   * @param vtxLikeDelegatee The address to delegate votes to
   */
  function _delegateVtxLikeTo(address vtxLikeDelegatee) external {
    require(msg.sender == admin, "only the admin may set the vtx-like delegate");
    VtxLike(underlying).delegate(vtxLikeDelegatee);
  }
}
