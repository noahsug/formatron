import parseTemplate from '~/template';

import ValueType from './';

export default class TemplateType extends ValueType {
  static typeName = 'template';

  getTemplate() {
    return this.options.get('template');
  }

  getValue(renderData) {
    return parseTemplate(this.getTemplate(), renderData);
  }
}

