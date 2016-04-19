/*
Copyright ©2014 Esri. All rights reserved.

TRADE SECRETS: ESRI PROPRIETARY AND CONFIDENTIAL
Unpublished material - all rights reserved under the
Copyright Laws of the United States and applicable international
laws, treaties, and conventions.

For additional information, contact:
Attn: Contracts and Legal Department
Environmental Systems Research Institute, Inc.
380 New York Street
Redlands, California, 92373
USA

email: contracts@esri.com
*/

define([
  "dojo/Evented",
  "dojo",
  "dojo/_base/declare",
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/dom-class',
   'jimu/filterUtils'
], function (
  Evented,
  dojo,
  declare,
  lang,
  array,
  domClass,
  filterUtils
  ) {
  return declare([Evented], {
    OPERATORS: null,
    constructor: function () {
      this._filterUtils = new filterUtils();
      this.OPERATORS = lang.clone(this._filterUtils.OPERATORS);
    },
    toggleFields: function (attTable, fieldValidation, feature, gdbRequiredFields, configNotEditableFields) {
      if (attTable === undefined || attTable == null) {
        return;
      }

      if (fieldValidation === undefined || fieldValidation === null) {
        return;
      }

      if (feature === undefined || feature === null) {
        return;
      }

      var actionType = null
      var hasRule = false;
      var fields = feature.getLayer().fields;

      var rowsWithError = [];
      var results;
      fields.forEach(lang.hitch(this, function (field) {
        actionType = null;
        // hasRule, actionType, fieldValid 
        results = this.validateField(field.name, fieldValidation, feature);
        if (results[2] === false) {
          rowsWithError.push({ 'fieldName': field.name })
        }
        this.toggleFieldOnAttributeInspector(field.alias, results[1], attTable, gdbRequiredFields, configNotEditableFields);
      }));
      return rowsWithError;
    },
    validateField: function (fieldName, fieldValidation, feature) {
      var filter = null;
      if (fieldValidation.hasOwnProperty(fieldName)) {

        if (fieldValidation[fieldName].length === 0) {
          return [false, null, true];
        }
        else {
          for (var actionDetails in fieldValidation[fieldName]) {
            if (fieldValidation[fieldName].hasOwnProperty(actionDetails)) {
              filter = fieldValidation[fieldName][actionDetails].filter;
              if (filter !== undefined && filter !== null) {

                if (this.processFilter(filter, feature)) {
                  //if (fieldValidation[fieldName][actionDetails].action === 'Required') {
                  if (actionDetails === 'Required') {
                    if (feature.attributes.hasOwnProperty(fieldName) === false) {
                      return [true, actionDetails, false];
                    }
                    else if (feature.attributes[fieldName] === null) {
                      return [true, actionDetails, false];
                    }
                    else {
                      return [true, actionDetails, true];
                    }
                  }
                  else {
                    return [true, actionDetails, true];
                  }


                }
              }
            }

          }
          return [true, null, true];
        }
      }
      else {
        return [false, null, true];
      }

    },

    processFilter: function (filter, feature) {
      var partResults = [];
      array.forEach(filter.parts, function (part) {
        if (part.hasOwnProperty('parts')) {
          partResults.push(this.processFilter(part, feature));
        }
        else {
          var value1 = null;
          var value2 = null;

          if (part.valueObj.hasOwnProperty('value')) {
            value1 = part.valueObj.value;
          }
          if (part.valueObj.hasOwnProperty('value1')) {
            value1 = part.valueObj.value1;
          }
          if (part.valueObj.hasOwnProperty('value2')) {
            value2 = part.valueObj.value2;
          }

          switch (part.valueObj.type) {
            case 'value':
              partResults.push(this.validatePart(part.operator,
                               feature.attributes[part.fieldObj.name],
                               value1,
                               value2,
                               part.caseSensitive));
              break;
            case 'field':

              partResults.push(this.validatePart(part.operator,
                                                 feature.attributes[part.fieldObj.name],
                                                 value1,
                                                 value2,
                                                 part.caseSensitive));
              break;
            default:
              break;
          }
        }
      }, this);

      return this.ruleValid(partResults, filter.logicalOperator);
    },
    ruleValid: function (partResults, logOp) {
      var performAction = false;

      if (logOp === undefined || logOp === null) {
        logOp = 'OR';
      }
      array.some(partResults, function (result) {

        if (logOp === 'OR') {
          if (result === true) {
            performAction = true;
            return true;
          }
          else {
            performAction = false;
          }
        } else {
          if (result === false) {
            performAction = false;
            return true;
          } else {
            performAction = true;
          }
        }
      });
      return performAction;

    },
    _isNumeric: function (n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    },
    validatePart: function (operator, field, value1, value2, caseSensitive) {
      if (operator === undefined || operator === null) {
        return false;
      }
      if (operator.lastIndexOf('string', 0) === 0) {
        if (caseSensitive === false) {
          if (field !== undefined && field !== null) {
            field = String(field).toUpperCase();
          }
          if (value1 !== undefined && value1 !== null) {
            value1 = String(value1).toUpperCase();
          }
          if (value2 !== undefined && value2 !== null) {
            value2 = String(value2).toUpperCase();
          }

        }
      }
      else if (operator.lastIndexOf('date', 0) === 0) {
        if (value1 !== undefined && value1 !== null) {
          value1 = new Date(value1);
        }
        if (value2 !== undefined && value2 !== null) {
          value2 = new Date(value2);
        }
      }

      switch (operator) {
        case this.OPERATORS.stringOperatorIs:

          if (field === value1) {
            return true;
          }
          break;
        case this.OPERATORS.stringOperatorIsNot:
          if (field !== value1) {
            return true;
          }
          break;
        case this.OPERATORS.stringOperatorStartsWith:
          if (field === null && value1 === null) {
            return true;
          }
          if (field === null && value1 !== null) {
            return false;
          }
          if (field !== null && value1 === null) {
            return false;
          }
          if (field.lastIndexOf(value1, 0) === 0) {
            return true;
          }

          break;
        case this.OPERATORS.stringOperatorEndsWith:
          if (field === null && value1 === null) {
            return true;
          }
          if (field === null && value1 !== null) {
            return false;
          }
          if (field !== null && value1 === null) {
            return false;
          }
          return this._endsWith(field, value1);
        case this.OPERATORS.stringOperatorContains:
          if (field === null && value1 === null) {
            return true;
          }
          if (field === null && value1 !== null) {
            return false;
          }
          if (field !== null && value1 === null) {
            return false;
          }
          if (String(field).indexOf(value1 >= 0)) {
            return true;
          }
          break;
        case this.OPERATORS.stringOperatorDoesNotContain:
          if (field === null && value1 === null) {
            return false;
          }
          if (field === null && value1 !== null) {
            return true;
          }
          if (field !== null && value1 === null) {
            return true;
          }
          if (String(field).indexOf(value1 >= 0)) {
            return false;
          }

          break;
        case this.OPERATORS.stringOperatorIsBlank:
          return (field === null || field === undefined);
          break;
        case this.OPERATORS.stringOperatorIsNotBlank:
          return (field !== null && field !== undefined);

          break;
        case this.OPERATORS.numberOperatorIs:
          if (this._isNumeric(field)) {
            return String(field) === String(value1);
          }
          return false;
          break;
        case this.OPERATORS.numberOperatorIsNot:
          if (this._isNumeric(field)) {
            return (String(field) !== String(value1));
          }
          return false;
          break;
        case this.OPERATORS.numberOperatorIsAtLeast:
          if (this._isNumeric(field) && this._isNumeric(value1)) {
            return field >= value1;
          }
          return false;
          break;
        case this.OPERATORS.numberOperatorIsLessThan:
          if (this._isNumeric(field) && this._isNumeric(value1)) {
            return field < value1;
          }
          return false;
          break;
        case this.OPERATORS.numberOperatorIsAtMost:
          if (this._isNumeric(field) && this._isNumeric(value1)) {
            return field <= value1;
          }
          return false;
          break;
        case this.OPERATORS.numberOperatorIsGreaterThan:
          if (this._isNumeric(field) && this._isNumeric(value1)) {
            return field > value1;
          }
          return false;
          break;
        case this.OPERATORS.numberOperatorIsBetween:
          if (this._isNumeric(field) && this._isNumeric(value1) && this._isNumeric(value2)) {
            return field > value1 && field < value2;
          }
          return false;
          break;
        case this.OPERATORS.numberOperatorIsNotBetween:
          if (this._isNumeric(field) && this._isNumeric(value1) && this._isNumeric(value2)) {
            return field <= value1 || field >= value2;
          }
          return false;
        case this.OPERATORS.numberOperatorIsBlank:
          if (field === null || field === undefined) {
            return true;
          }
          break;
        case this.OPERATORS.numberOperatorIsNotBlank:
          if (field !== null && field !== undefined) {
            return true;
          }

          break;
        case this.OPERATORS.dateOperatorIsOn:
          if (field === undefined || field === null) {
            return false;
          }
          if (value1 === undefined || value1 === null) {
            return false;
          }

          var d = new Date(0);
          d.setUTCSeconds(field);
          return value1.toDateString() === field.toDateString();
          break;
        case this.OPERATORS.dateOperatorIsNotOn:
          if (field === undefined || field === null) {
            return false;
          }
          if (value1 === undefined || value1 === null) {
            return false;
          }

          var d = new Date(0);
          d.setUTCSeconds(field);
          return !(value1.toDateString() === field.toDateString());
          break;
        case this.OPERATORS.dateOperatorIsBefore:
          if (field === null || field === undefined) {
            return false;
          }
          if (value1 === undefined || value1 === null) {
            return false;
          }
          return field < (value1.getTime());
          break;
        case this.OPERATORS.dateOperatorIsAfter:
          if (field === null || field === undefined) {
            return false;
          }
          if (value1 === undefined || value1 === null) {
            return false;
          }
          return field > (value1.getTime());
          break;
        case this.OPERATORS.dateOperatorIsBetween:
          if (field === null || field === undefined) {
            return false;
          }
          if (value1 === undefined || value1 === null) {
            return false;
          }
          if (value2 === undefined || value2 === null) {
            return false;
          }
          return field > (value1.getTime()) && field < (value2.getTime());
          break;
        case this.OPERATORS.dateOperatorIsNotBetween:
          if (field === null || field === undefined) {
            return false;
          }
          if (value1 === undefined || value1 === null) {
            return false;
          }
          if (value2 === undefined || value2 === null) {
            return false;
          }
          return field <= (value1.getTime()) || field >= (value2.getTime());
          break;
        case this.OPERATORS.dateOperatorIsBlank:
          if (field === null || field === undefined) {
            return true;
          }

          break;
        case this.OPERATORS.dateOperatorIsNotBlank:
          if (field !== null && field !== undefined) {
            return true;
          }

          break;
        case this.OPERATORS.dateOperatorDays:
          //Not exposed in control, not implemented in app
          if (field === null || field === undefined) {
            //return true;
          }
          return false;
          break;
        case this.OPERATORS.dateOperatorWeeks:
          //Not exposed in control, not implemented in app
          if (field === null || field === undefined) {
            //return true;
          }
          return false;
          break;
        case this.OPERATORS.dateOperatorMonths:
          //Not exposed in control, not implemented in app
          if (field === null || field === undefined) {
            //return true;
          }
          return false;
          break;
        case this.OPERATORS.dateOperatorInTheLast:
          //Not exposed in control, not implemented in app
          if (field === null || field === undefined) {
            //return true;
          }
          return false;
          break;
        case this.OPERATORS.dateOperatorNotInTheLast:
          //Not exposed in control, not implemented in app
          if (field === null || field === undefined) {
            //return true;
          }
          return false;
          break;
        default:
          return false;
      }
      return false;
    },
    _processChildNodes: function (element, state) {
      element.disabled = state;
      if (state === true) {
        element.style.pointerEvents = 'none';
      }
      else {
        element.style.pointerEvents = 'auto';
      }
      array.forEach(element.childNodes, function (node) {
        node.disabled = state;
        if (state === true) {
          node.style.pointerEvents = 'none';
        }
        else {
          node.style.pointerEvents = 'auto';
        }

        if (node.childNodes.length > 0) {
          this._processChildNodes(node, state)
        }
      }, this);
    },
    toggleFieldOnAttributeInspector: function (fieldName, actionType,
      attTable, gdbRequiredFields, notEditableFields) {
      if (attTable === undefined || attTable === null) {
        return;
      }

      if (attTable.length > 0) {
        var row = attTable.filter(lang.hitch(this, function (row) {
          return row.childNodes[0].data === fieldName;
        }));

        if (row !== null) {
          if (row.length > 0) {
            var valueCell = row[0].parentNode.childNodes[1].childNodes[0];
            var parent = row[0].parentNode;
            //var labelCell = row[0]; // defined but never used
            switch (actionType) {
              case 'Hide':
                domClass.add(parent, "hideField");
                break;
              case 'Disabled':

                domClass.add(valueCell, ["dijitValidationTextBox", "dijitTextBoxDisabled", "dijitComboBoxDisabled",
                                         "dijitValidationTextBoxDisabled", "dijitDisabled"]);

                this._processChildNodes(valueCell, true);
                break;
              case 'Required':
                domClass.add(valueCell, ["dijitTextBoxError", "dijitComboBoxError","dijitValidationTextBoxError", "dijitError"]);
                //var l = valueCell.id.slice(7);
                //dijit.byId(l).set("required", true);
                //dijit.byId(valueCell.id.replace('widget_','').set("required", true));
                //add this to first child
                //<div class="dijitReset dijitValidationContainer"><input class="dijitReset dijitInputField dijitValidationIcon dijitValidationInner" value="Χ " type="text" tabindex="-1" readonly="readonly" role="presentation"></div>
                //if (valueCell.childNodes.length > 1) {
                //  var newDiv = document.createElement('div');
                //  newDiv.setAttribute('class', "dijitReset dijitValidationContainer");
                //  var newIn = document.createElement('input');
                //  newIn.setAttribute('class', "dijitReset dijitInputField dijitValidationIcon dijitValidationInner");
                //  newIn.setAttribute('value', "x");
                //  newIn.setAttribute('type', 'text');
                //  newIn.setAttribute('tabindex', '-1');
                //  newIn.setAttribute('readonly', 'readonly');
                //  newIn.setAttribute('role', 'presentation');
                //  newDiv.appendChild(newIn);  
                //  valueCell.insertBefore(newDiv, valueCell.childNodes[0]);
                //}
                if (row[0].childNodes.length === 1) {
                  var newA = document.createElement('a');
                  newA.setAttribute('class', "asteriskIndicator");
                  newA.innerHTML = " *";
                  row[0].appendChild(newA);


                }
                break;
              case 'Value':
                break;
              default:
                if (row[0].childNodes.length > 1) {
                  if (gdbRequiredFields.indexOf(fieldName) === -1) {
                    row[0].removeChild(row[0].childNodes[1]);
                  }
                }
                if (domClass.contains(parent, "hideField")) {
                  domClass.remove(parent, "hideField");
                }
                if (domClass.contains(valueCell, "dijitTextBoxError")) {
                  domClass.remove(valueCell, "dijitTextBoxError");
                }
                if (domClass.contains(valueCell, "dijitComboBoxError")) {
                  domClass.remove(valueCell, "dijitComboBoxError");
                }
                if (domClass.contains(valueCell, "dijitValidationTextBoxError")) {
                  domClass.remove(valueCell, "dijitValidationTextBoxError");
                }
                if (domClass.contains(valueCell, "dijitError")) {
                  domClass.remove(valueCell, "dijitError");
                }
                
                if (notEditableFields.indexOf(fieldName) === -1) {
                  if (domClass.contains(valueCell, "dijitTextBoxDisabled")) {
                    domClass.remove(valueCell, "dijitTextBoxDisabled");
                  }
                  if (domClass.contains(valueCell, "dijitComboBoxDisabled")) {
                    domClass.remove(valueCell, "dijitComboBoxDisabled");
                  }
                  if (domClass.contains(valueCell, "dijitValidationTextBoxDisabled")) {
                    domClass.remove(valueCell, "dijitValidationTextBoxDisabled");
                  }
                  if (domClass.contains(valueCell, "dijitDisabled")) {
                    domClass.remove(valueCell, "dijitDisabled");
                  }
                }
                this._processChildNodes(valueCell, false);
            }

          }
        }

      }
    }

  });
});
