import {List, Map} from 'immutable';

import {parseRef} from '~/refs';

import {ImmutableDataType} from './';
import ValidationError from './validationError';

export default class ImmutableMapType extends ImmutableDataType {
  static typeName = 'map';

  static parseOptions(field, parseField) {
    return super.parseOptions(field, parseField)
      .update('data', data => data
        .map(fieldData => fieldData
          .update('field', parseField)
        )
      );
  }

  getDefaultValue() {
    return super.getDefaultValue(Map());
  }

  getData() {
    return this.options.get('data');
  }

  hasValue(model) {
    if (!super.hasValue(model)) {
      return false;
    }
    // TODO: Check if child types have a value.
    return model && model.size > 0;
  }

  getFieldData(ref) {
    return this.getData()
      .find(fieldData => fieldData.get('field').getName() == ref.ref);
  }

  getValue(model, ref) {
    model = model || this.getDefaultValue();
    if (ref) {
      return this.getFieldAndValue(model, ref).value;
    } else {
      return model
        .update(model => this.getData()
          .reduce(
            (model, fieldData) => {
              const field = fieldData.get('field');
              const path = fieldData.get('path');
              const value = field.getValue(model.getIn(path));
              return model.setIn(path, value);
            },
            model
          )
        );
    }
  }

  getField(refs) {
    if (!List.isList(refs)) {
      refs = List([refs]);
    }

    if (refs.size == 0) {
      return null;
    }

    const firstRef = refs.first();
    const fieldData = this.getFieldData(firstRef);
    const field = fieldData && fieldData.get('field');

    this.getNextField(field, refs.rest());
  }

  getFieldAndValue(model, refs) {
    if (!List.isList(refs)) {
      refs = List([refs]);
    }

    if (refs.size == 0) {
      return {};
    }

    if (!model) {
      return {field: this.getDataField(refs)};
    }

    const firstRef = refs.first();
    const fieldData = this.getFieldData(firstRef);

    if (!fieldData) {
      throw new Error(`Cannot find field for ref "${firstRef}" on "${model}"`);
    }
    
    const path = fieldData.get('path');
    const field = fieldData.get('field');
    const value = field.getValue(model.getIn(path));

    return this.getNextFieldAndValue(field, value, refs.rest());
  }

  setValue(model, refs, newValue) {
    if (!model) {
      throw new Error('Invalid arguments to setDataValue: model = null');
    }

    if (!List.isList(refs)) {
      refs = List([refs]);
    }

    if (refs.size == 0) {
      throw new Error(`Invalid arguments to setDataValue: refs = ${refs}`);
    }

    const firstRef = refs.first();
    const fieldData = this.getFieldData(firstRef)

    if (!fieldData) {
      throw new Error(`Cannot find field for ref "${firstRef}" on "${model}"`);
    }

    const path = fieldData.get('path');
    const field = fieldData.get('field');
    const oldValue = model.getIn(path);

    return model
      .setIn(path, this
        .setNextValue(field, oldValue, newValue, refs.rest())
      );
  }

  validate(model) {
    return super.validate(model, () => {
      return this.getData()
        .map(fieldData => {
          const field = fieldData.get('field');
          const ref = parseRef(field.getName());
          return this.validateSingle(model, ref);
        })
        .flatten(true)
        .filter(error => error)
        .map(error => {
          error.addRef(parseRef(error.field.getName()));
          error.field = this;
          return error;
        });
    });
  }

  // TODO: Probably move this out of here and into some form validation module.
  validateSingle(model, ref) {
    const {field, value} = this.getFieldAndValue(model, ref);

    return List([
      field.getValidationLinks()
        .map(linkRef => this.validateSingle(model, parseRef(linkRef)))
        .flatten(true)
        .filter(error => error),

      List([
        field.validate(value),
        field.getValidator()(value, model)
      ])
        .filter(error => error)
    ]).flatten(true);
  }
}
