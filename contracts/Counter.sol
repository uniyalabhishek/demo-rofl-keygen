// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Counter - minimal example used by demo-rofl-keygen
/// @notice No constructor args; keeps the deploy path trivial.
contract Counter {
    uint256 private _value;

    event Incremented(uint256 newValue);
    event Set(uint256 newValue);

    function current() external view returns (uint256) {
        return _value;
    }

    function inc() external {
        unchecked {
            _value += 1;
        }
        emit Incremented(_value);
    }

    function set(uint256 v) external {
        _value = v;
        emit Set(v);
    }
}
