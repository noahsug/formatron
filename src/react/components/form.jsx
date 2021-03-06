import classNames from 'classnames';
import Immutable, {List, Map} from 'immutable';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';

import Loading from '~/react/components/loading';
import reactRenderers from '~/react/renderers';
import FormatronPropTypes from '~/react/propTypes';
import {parseRef} from '~/refs';
import RenderData from '~/renderers/renderData';

export default class Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.createInitialState(props);
  }

  createInitialState(props) {
    const defaultValue = this.updateRefs(props.defaultValue);
    const disabled = this.updateRefs(props.disabled);
    return {
      changes: Map(),
      dirty: Map(),
      errors: Map(),
      // TODO: This has plenty of issues but is "good enough" (tm) for now.
      viewLabels: Map(),
      model: this.cacheModel(props, defaultValue, disabled),
      defaultValue,
      disabled
    };
  }

  componentWillReceiveProps(newProps) {
    if (!Immutable.is(newProps.model, this.props.model) ||
        !Immutable.is(newProps.disabled, this.props.disabled) ||
        !Immutable.is(newProps.defaultValue, this.props.defaultValue)) {
      this.setState(this.createInitialState(newProps));
    }
  }

  updateRefs(values) {
    return values && values
      .mapKeys(ref => parseRef(ref));
  }

  cacheModel(props, defaultValue, disabled) {
    return props.dataType
      .getValue(props.model)
      .update(updateValues(props.model, defaultValue))
      .update(updateValues(props.model, disabled));

    function updateValues(model, values) {
      if (!values || !Immutable.isImmutable(values)) {
        return model => model;
      } else {
        return model => values
          .reduce(
            (model, value, ref) => {
              if (typeof value != 'undefined') {
                return props.dataType.setValue(model, ref, value);
              }
              return model
            },
            model
          );
      }
    }
  }

  isValid() {
    const validationErrors = this.props.dataType.validate(this.state.model);

    if (validationErrors && validationErrors.size != 0) {
      console.error(validationErrors.toJS());

      this.setState({
        errors: validationErrors
          .toMap()
          .mapEntries(([i, error]) => [
            error.ref,
            error
          ]),

        dirty: validationErrors
          .map(error => error.ref)
          .reduce(
            (dirty, ref) => dirty.set(ref, true),
            this.state.dirty
          )
      });
      return false;
    } else {
      this.setState({
        errors: Map(),
        dirty: Map()
      });
      return true;
    }
  }

  isDisabled = ref => {
    // TODO: Recursively check parent refs?
    return this.props.loading ||
      this.state.disabled === true ||
      (this.state.disabled && this.state.disabled.get(ref, false));
  }

  getError = ref => {
    return this.state.errors.get(ref);
  }

  onBlur = ref => {
    // This `setTimeout` is a dirty hack since `onBlur` and `onChange` are
    // sometimes called directly after each other, and `onBlur` requires
    // the state changes from `onChange` to have completed first.
    setTimeout(() => {
      const validationErrors = this.props.dataType.validate(this.state.model);
      const errorMap = validationErrors
        .filter(error => this.state.dirty.get(error.ref))
        .toMap()
        .mapEntries(([i, error]) => [
            error.ref,
            error
        ]);

      this.setState({errors: errorMap});
    });
  }

  onButtonClick = (...args) => {
    if (this.props.onButtonClick) {
      this.props.onButtonClick(...args);
    }
  }

  onChange = (ref, value, viewLabel) => {
    const newModel = this.props.dataType
      .setValue(this.state.model, ref, value);

    const field = this.props.dataType.getField(ref);
    const update = field.hasValue(value) || this.state.dirty.get(ref);

    this.setState({
      changes: update
        ? this.state.changes.set(ref, value)
        : this.state.changes.remove(ref),
      dirty: this.state.dirty.set(ref, update),
      viewLabels: this.state.viewLabels.set(ref, viewLabel),
      model: newModel
    });

    if (this.props.onChange) {
      this.props.onChange(newModel);
    }
  }

  onSubmit = e => {
    e.preventDefault();

    if (!this.props.onSubmit) {
      return;
    }

    if (this.isValid()) {
      this.props.onSubmit(this.state.model);
    }
  }

  onReset = e => {
    this.setState(this.createInitialState(this.props));
  }

  render() {
    return (
      <form
        key={this.props.viewType.uniqueId}
        className={classNames('formatron-form', this.props.className)}
        onSubmit={this.onSubmit}
        onReset={this.onReset}
        noValidate='true'
      >
        {this.renderErrors()}
        {this.renderInputs()}
        {this.renderAction()}
      </form>
    );
  }

  renderErrors() {
    const errors = this.props.errors ?
      this.props.errors :
      this.props.error ?
        [this.props.error] :
        [];

    const validationErrors = this.state.errors;

    return (errors.length > 0 || validationErrors.size > 0) ? (
      <div className='formatron-form-errors'>
        {errors
          .map((error, i) => (
            <p key={i} className='formatron-form-error'>{error.message}</p>
          ))
        }

        {validationErrors.size > 0 ? (
          <div className='formatron-form-error'>
            <p className='formatron-form-validation-error'>The following fields have an error:</p>
            {validationErrors
              .map((error, ref) => {
                const refValue = this.state.viewLabels.get(ref) || ref
                  .map(ref => ref.getDisplay())
                  .join(', ');
                return (
                  <p key={refValue} className='formatron-form-validation-error'>
                    {refValue}
                  </p>
                );
              })
              .toList()
            }
          </div>
        ) : null}
      </div>
    ) : null;
  }

  renderInputs() {
    const viewTypes = this.props.viewTypes;

    const renderData = new RenderData(this.props.dataType, this.state.model, {
      viewTypes: this.props.viewTypes,
      getError: this.getError,
      isDisabled: this.isDisabled,
      onBlur: this.onBlur,
      onButtonClick: this.onButtonClick,
      onChange: this.onChange
    });
    return reactRenderers.renderFormField(this.props.viewType, renderData);
  }

  renderAction() {
    return <div className={this.props.actionsClassName}>
      {this.props.loading ? (
        <Loading />
      ) : (
        this.props.actions
      )}
    </div>;
  }
}

Form.defaultProps = {
  model: Map()
};

Form.propTypes = {
  viewTypes: ImmutablePropTypes.map,
  viewType: React.PropTypes.oneOfType([
    React.PropTypes.string.isRequired,
    FormatronPropTypes.viewType.isRequired
  ]).isRequired,
  dataType: FormatronPropTypes.dataType.isRequired,
  model: ImmutablePropTypes.map,

  defaultValue: ImmutablePropTypes.map,
  disabled: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    ImmutablePropTypes.map
  ]),
  loading: React.PropTypes.bool,

  onButtonClick: React.PropTypes.func,
  onChange: React.PropTypes.func,
  onSubmit: React.PropTypes.func,

  className: React.PropTypes.string,

  errors: React.PropTypes.arrayOf(React.PropTypes.instanceOf(Error)),
  error: React.PropTypes.instanceOf(Error),

  actionsClassName: React.PropTypes.string,
  actions: React.PropTypes.arrayOf(React.PropTypes.element)
};
