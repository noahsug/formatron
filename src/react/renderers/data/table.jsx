import Table from '~/react/components/table';
import TableType from '~/types/view/data/table';

import {withStaticLabel} from '../formHelpers';
import ReactRenderer from '../reactRenderer';

const FormatronTable = withStaticLabel(({viewType, renderData}) => {
  const {field, value} = viewType.getFieldAndValue(renderData);
  const {isDisabled, onChange, onBlur} = renderData.options;

  const ref = viewType.getRef();
  const editable = !isDisabled(ref) && viewType.isEditable();

  const height = (value.size + 1) * 40;

  return (
    <div className='formatron-table' style={{height}}>
      <Table
        dataType={field.getItemType()}
        columns={viewType.getColumns()}
        models={value}
        context={renderData}
        editable={editable}
        onChange={(index, subValue) => onChange(ref, value.set(index, subValue, viewType.getLabel(renderData)))}
        onBlur={() => onBlur(ref)}
        size='auto'
      />
    </div>
  );
});

export default ReactRenderer.register(
  TableType,
  FormatronTable,
  FormatronTable
);

