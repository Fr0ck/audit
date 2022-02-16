// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {TokenBasic} from "./TokenBasic.sol";

// solhint-disable-next-line no-empty-blocks
contract FrockTokenV1 is TokenBasic {

    address public reflection;
    address public treasury;
    address public marketing;

    uint16 public reflectionPercentage; // Using 2 decimals
    uint16 public treasuryPercentage; // Using 2 decimals
    uint16 public marketingPercentage; // Using 2 decimals
    uint16 public burnPercentage; // Using 2 decimals

    event ReflectionUpdated(address newReflectionAddress);
    event TreasuryUpdated(address newTreasuryAddress);
    event MarketingUpdated(address newMarketingAddress);
    event PercentageUpdated(uint16 reflectionPercentage,  uint16 treasuryPercentage, uint16 marketingPercentage);

    function setReflection(address newAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reflection = newAddress;
        emit ReflectionUpdated(newAddress);
    }

    function setTreasury(address newAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = newAddress;
        emit TreasuryUpdated(newAddress);
    }

    function setMarketing(address newAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        marketing = newAddress;
        emit MarketingUpdated(newAddress);
    }

     function setPercentage(uint16 reflectionPrctg,  uint16 treasuryPrctg, uint16 marketingPrctg) external onlyRole(DEFAULT_ADMIN_ROLE) {            
        reflectionPercentage = reflectionPrctg;
        treasuryPercentage = treasuryPrctg;
        marketingPercentage = marketingPrctg;        
        emit PercentageUpdated(reflectionPrctg, treasuryPrctg, marketingPercentage);
    }



    /**
    * @dev Override transfer function to apply tax deduction
    */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        super._transfer(_msgSender(), recipient, amount);

        _taxDeduction(_msgSender(), recipient, amount);                
        
        return true;
    }


    /**
    * @dev Override transferFrom function to apply tax deduction
    */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        super.transferFrom(sender, recipient, amount);

        _taxDeduction(sender, recipient, amount);         

        return true;
    }

    function _taxDeduction(address sender, address recipient, uint256 amount) internal virtual {
        if(!(isExcludedFromFees[sender] || isExcludedFromFees[recipient])) {                   
            require(reflection != address(0) && treasury != address(0) && marketing != address(0), "Tax : Address not set correctly");
            require(reflectionPercentage + treasuryPercentage + marketingPercentage != 0, "Tax : Percentage not set correctly");

            // Calculate amount
            uint256 reflectionAmount = uint256(reflectionPercentage) * amount / 100_00;
            uint256 treasuryAmount = uint256(treasuryPercentage) * amount / 100_00;
            uint256 marketingAmount = uint256(marketingPercentage) * amount / 100_00;

            // Transfer token        
            _transfer(recipient, reflection, reflectionAmount);
            _transfer(recipient, treasury, treasuryAmount);
            _transfer(recipient, marketing, marketingAmount);            
        }                                      
    }
  
}
