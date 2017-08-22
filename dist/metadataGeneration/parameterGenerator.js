"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var metadataGenerator_1 = require("./metadataGenerator");
var resolveType_1 = require("./resolveType");
var exceptions_1 = require("./exceptions");
var decoratorUtils_1 = require("./../utils/decoratorUtils");
var validatorUtils_1 = require("./../utils/validatorUtils");
var METHODS_SUPPORTING_BODY = ['post', 'put', 'patch'];
var PARAMETER_DECORATORS = ['header', 'query', 'path', 'body', 'bodyprop', 'request', 'uploadedfile', 'uploadedfiles', 'formfield'];
var SUPPORTED_PARAMETER_TYPES = ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer',
    'boolean', 'enum', 'file', 'file[]'];
var ParameterGenerator = (function () {
    function ParameterGenerator(parameter, method, path) {
        this.parameter = parameter;
        this.method = method;
        this.path = path;
    }
    ParameterGenerator.prototype.Generate = function () {
        var _this = this;
        var decoratorName = decoratorUtils_1.getDecoratorName(this.parameter, function (identifier) { return _this.supportParameterDecorator(identifier.text); });
        switch (decoratorName) {
            case 'Request':
                return this.getRequestParameter(this.parameter);
            case 'Body':
                return this.getBodyParameter(this.parameter);
            case 'BodyProp':
                return this.getBodyPropParameter(this.parameter);
            case 'Header':
                return this.getHeaderParameter(this.parameter);
            case 'Query':
                return this.getQueryParameter(this.parameter);
            case 'Path':
                return this.getPathParameter(this.parameter);
            case 'UploadedFile':
                return this.getUploadedFileParameter(this.parameter);
            case 'UploadedFiles':
                return this.getUploadedFilesParameter(this.parameter);
            case 'FormField':
                return this.getFormFieldParameter(this.parameter);
            default:
                return this.getPathParameter(this.parameter);
        }
    };
    ParameterGenerator.prototype.getCurrentLocation = function () {
        var methodId = this.parameter.parent.name;
        var controllerId = this.parameter.parent.parent.name;
        return controllerId.text + "." + methodId.text;
    };
    ParameterGenerator.prototype.getRequestParameter = function (parameter) {
        var parameterName = parameter.name.text;
        return {
            description: this.getParameterDescription(parameter),
            in: 'request',
            name: parameterName,
            required: !parameter.questionToken,
            type: { typeName: 'object' },
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getBodyPropParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportBodyMethod(this.method)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Body can't support '" + this.getCurrentLocation() + "' method.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'body-prop',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'BodyProp'; }) || parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getBodyParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportBodyMethod(this.method)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Body can't support " + this.method + " method");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'body',
            name: parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getHeaderParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportParameterType(type)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter '" + parameterName + "' can't be passed as a header parameter in '" + this.getCurrentLocation() + "'.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'header',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'Header'; }) || parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getQueryParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportParameterType(type)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter '" + parameterName + "' can't be passed as a query parameter in '" + this.getCurrentLocation() + "'.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'query',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'Query'; }) || parameterName,
            required: !parameter.questionToken,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getPathParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        var pathName = decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'Path'; }) || parameterName;
        if (!this.supportParameterType(type)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter '" + parameterName + ":" + type + "' can't be passed as a path parameter in '" + this.getCurrentLocation() + "'.");
        }
        if (!this.path.includes("{" + pathName + "}")) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter '" + parameterName + "' can't match in path: '" + this.path + "'");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'path',
            name: pathName,
            required: true,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getUploadedFileParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = { typeName: 'file' };
        if (!this.supportParameterType(type)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter '" + parameterName + ":" + type + "' can't be passed as an uploaded file parameter in '" + this.getCurrentLocation() + "'.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'UploadedFile'; }) || parameterName,
            required: true,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getUploadedFilesParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = { typeName: 'file[]' };
        if (!this.supportParameterType(type)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter '" + parameterName + ":" + type + "' can't be passed as an uploaded files parameter in '" + this.getCurrentLocation() + "'.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'UploadedFiles'; }) || parameterName,
            required: true,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getFormFieldParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = { typeName: 'string' };
        if (!this.supportParameterType(type)) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter '" + parameterName + ":" + type + "' can't be passed as form field parameter in '" + this.getCurrentLocation() + "'.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'FormField'; }) || parameterName,
            required: true,
            type: type,
            parameterName: parameterName,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getParameterDescription = function (node) {
        var symbol = metadataGenerator_1.MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);
        if (symbol) {
            var comments = symbol.getDocumentationComment();
            if (comments.length) {
                return ts.displayPartsToString(comments);
            }
        }
        return '';
    };
    ParameterGenerator.prototype.supportBodyMethod = function (method) {
        return METHODS_SUPPORTING_BODY.some(function (m) { return m === method.toLowerCase(); });
    };
    ParameterGenerator.prototype.supportParameterDecorator = function (decoratorName) {
        return PARAMETER_DECORATORS.some(function (d) { return d === decoratorName.toLocaleLowerCase(); });
    };
    ParameterGenerator.prototype.supportParameterType = function (parameterType) {
        return SUPPORTED_PARAMETER_TYPES.find(function (t) { return t === parameterType.typeName; });
    };
    ParameterGenerator.prototype.getValidatedType = function (parameter) {
        if (!parameter.type) {
            throw new exceptions_1.GenerateMetadataError(parameter, "Parameter " + parameter.name + " doesn't have a valid type assigned in '" + this.getCurrentLocation() + "'.");
        }
        return resolveType_1.ResolveType(parameter.type);
    };
    return ParameterGenerator;
}());
exports.ParameterGenerator = ParameterGenerator;
//# sourceMappingURL=parameterGenerator.js.map