const InsightApi = require("../Repositories/InsightApi");
const SolidityCoder = require('../Components/Solidity/SolidityCoder');
const async = require('async');
const _ = require('lodash');
const SolidityParamCreator = require('../Components/Solidity/SolidityParamCreator');

class ContractsInfoService {

    constructor(solidityInterface, functionHashes) {
        this.interface = solidityInterface;
        this.functionHashes = functionHashes;
        this.findedFields = {};
        this.solidities = {};
        this.paramCreator = new SolidityParamCreator(this.interface, this.functionHashes);
    }

    fetchInfoBySolidityParams(contractAddress, args, cb) {
        let result = {};

        async.each(args, (param, callback) => {

            this.call(contractAddress, param, (err, data) => {

                if (err) {
                    return callback(err);
                }

                result[param.paramName] = data;

                callback();
            });
        }, (err) => {

            if (err) {
                return cb(null, null);
            }

            return cb(null, result);

        });

    }

    call(contractAddress, param, callback) {

        let result;

        InsightApi.callContract(contractAddress, param.hash, (err, data) => {

            try {

                let solidity = this._getSolidityInterfaceEncoder(param.paramName);

                result = solidity.unpackOutput(data.output);

                switch (param.type) {
                    case "uint8":
                    case "uint256":
                        result = parseInt(result);
                }

            } catch (e) {
                return callback(e.message);
            }

            return callback(err, result);

        });

    }

    _getSolidityInterfaceEncoder(fieldName) {

        if (!this.solidities[fieldName]) {
            this.solidities[fieldName] = new SolidityCoder(this.interface.find((itemInterface) => {
                return itemInterface.name === fieldName;
            }));
        }

        return this.solidities[fieldName];

    }

    createParam(paramName, paramDataArray) {
        return this.paramCreator.createParam(paramName, paramDataArray)
    }

    /**
     *
     * @param contractAddress String
     * @param paramHashes Array
     * @param next function
     * @returns {*}
     */
    callEncodedParams(contractAddress, paramHashes, next) {

        let result = [];

        paramHashes = _.uniq(paramHashes);

        return async.each(paramHashes, (paramHash, callback) => {

            return InsightApi.callContract(contractAddress, paramHash, (err, data) => {

                if (err) {
                    return callback(err);
                }

                result.push({
                    hash: paramHash,
                    output: data.output
                });

                return callback(err, data);

            });

        }, (err) => {
            return next(err, result);
        });

    }

}

module.exports = ContractsInfoService;