import {valueRenderers} from '~/renderers';

import ValueType from './';

export default class PropertyType extends ValueType {
  static typeName = 'property';

  static parseOptions(field, parseField) {
    return super.parseOptions(field, parseField)
      .update('obj', parseField);
  }

  getObj() {
    return this.options.get('obj');
  }

  getProperty() {
    return this.options.get('property');
  }

  getValue(renderData) {
    const obj = valueRenderers.getValue(this.getObj(), renderData);
    return obj ?
      obj[this.getProperty()] :
      null;
  }
}

