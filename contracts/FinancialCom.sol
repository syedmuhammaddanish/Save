// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.7;

contract FinancialCom{
    int sum;
    mapping(string => mapping (address => int)) bill;
    mapping(string => mapping (address => int)) data;

    //Store billing data
    function storeBill(int[] memory value, address[] memory customer, string memory date) public {
        for(uint i = 0; i < value.length; i++){
            data[date][customer[i]] = value[i];
        }
    }

    //Maps date and customer information to the related energy consumption values
    function FinancialCalculation (int[] memory initialcon, int[] memory finalcon, int[] memory realcon, int initialprice, int finalprice, string memory date, address customer) public {
    sum = 0;
    for(uint i = 0; i < 144; i++){
        if (realcon[i] >= initialcon[i]) {
            sum += initialprice*finalcon[i];
        }
        else if (realcon[i] <= finalcon[i]) {
            sum += finalprice*finalcon[i];
        }
        else {
            sum += ((((initialprice - finalprice)*1000)/(initialcon[i]-finalcon[i])) * (realcon[i]-finalcon[i])) + (finalprice*1000);
        }
     }
     bill[date][customer] = sum;
    }   

    //Return total price
    function CalculatedBalance (string memory date, address customer) public view returns(int) {
        return data[date][customer];
    }

    function VerifiedBalance (string memory date, address customer) public view returns(int) {
        return bill[date][customer];
    }

    //Validate the financial calculation
    function TotalPriceCheck (int value, string memory date, address customer) public view returns(bool) {
        if (value == bill[date][customer]) {
            return true;
        }
        else {
            return false;
        }
    }
}
