import {
  useMemo,
  useCallback,
  useRef,
  useState,
  PropsWithChildren,
  FC,
} from 'react';
import cx from 'classnames';
import formatFn from 'date-fns/format';
import parse from 'date-fns/parse';
import PickerPopover from './PickerPopover';
import { SingleInputTrigger } from './PickerTrigger';

import PanelContext from '../context/PanelContext';
import useTimeValue from '../hooks/useTimeValue';
import useConfirmStatus from '../hooks/useConfirmStatus';
import { useEventCallbackRef } from '../../utils/hooks/useEventCallbackRef';
import pick from '../../utils/pick';
import {
  triggerCommonProps,
  timePanelProps,
  defaultTimePickerProps,
} from '../constants';
import {
  ISingleTimePickerPropsWithDefault,
  ITimePanelProps,
  SingleTime,
} from '../types';
import useSinglePopoverVisible from '../hooks/useSinglePopoverVisible';

const emptyTime: SingleTime = '';
const PanelContextProvider = PanelContext.Provider;
interface ITimePickerBaseProps extends ISingleTimePickerPropsWithDefault {
  ContentComponent: React.ComponentType<ITimePanelProps>;
  seperator?: string;
}

const TimePickerBase: FC<PropsWithChildren<ITimePickerBaseProps>> = ({
  onChange,
  disabledTime,
  onOpen,
  onClose,
  value,
  className,
  ContentComponent,
  defaultTime,
  selectedDate,
  autoComplete,
  disabled,
  ...restProps
}) => {
  const restPropsRef = useRef(restProps);
  restPropsRef.current = restProps;
  const { format, openPanel } = restPropsRef.current;
  const onChangeRef = useEventCallbackRef(onChange);

  const [visibleChange, setVisibleChange] = useState<boolean>(true);
  const { selected, setSelected } = useTimeValue(emptyTime, value);

  const { panelVisible, setPanelVisible, onVisibleChange } =
    useSinglePopoverVisible<string>(
      value ?? emptyTime,
      setSelected,
      onOpen,
      onClose,
      disabled,
      openPanel
    );

  const disabledTimeOption = useMemo(
    () => disabledTime?.(selectedDate) || {},
    [disabledTime, selectedDate]
  );
  const confirmStatus = useConfirmStatus({
    selected,
    disabledTimeOption,
    format,
  });

  const currentTime = useMemo(() => formatFn(new Date(), format), [format]);
  const selectCurrentDate = useMemo(
    () => parse(currentTime, format, selectedDate),
    [currentTime, format, selectedDate]
  );
  const isDisabledCurrent = useConfirmStatus({
    selected: currentTime,
    disabledTimeOption: disabledTime?.(selectCurrentDate) || {},
    format,
  });

  const onSelected = useCallback(
    (val, finished = false) => {
      setVisibleChange(false);
      setSelected(val);

      if (finished || autoComplete) {
        onChangeRef.current?.(val);
        finished && setVisibleChange(true);
        finished && setPanelVisible(openPanel ?? false);
      }
    },
    [openPanel, onChangeRef, setSelected, setPanelVisible, autoComplete]
  );

  const onClearInput = useCallback(
    evt => {
      evt.stopPropagation();
      onChangeRef.current?.(emptyTime);
    },
    [onChangeRef]
  );

  const trigger = useMemo(() => {
    const { hiddenIcon } = restPropsRef.current;
    const triggerProps = pick(restPropsRef.current, triggerCommonProps);
    return (
      <div>
        <SingleInputTrigger
          {...triggerProps}
          value={value}
          disabled={disabled}
          hiddenIcon={hiddenIcon}
          onClearInput={onClearInput}
          panelVisible={panelVisible}
          text={selected}
          icon="clock-o"
        />
      </div>
    );
  }, [value, selected, panelVisible, restPropsRef, disabled, onClearInput]);

  const content = useMemo(() => {
    const commonPanelProps = pick(restPropsRef.current, timePanelProps);
    return (
      <div className="zent-datepicker-panel">
        <ContentComponent
          {...commonPanelProps}
          defaultTime={defaultTime}
          disabledTimeOption={disabledTimeOption}
          selected={selected}
          onSelected={onSelected}
        />
      </div>
    );
  }, [
    selected,
    restPropsRef,
    defaultTime,
    disabledTimeOption,
    onSelected,
    ContentComponent,
  ]);

  return (
    <div className={cx('zent-datepicker', className)}>
      <PanelContextProvider
        value={{
          visibleChange,
          confirmStatus,
          isDisabledCurrent,
        }}
      >
        <PickerPopover
          panelVisible={panelVisible}
          onVisibleChange={onVisibleChange}
          trigger={trigger}
          content={content}
        />
      </PanelContextProvider>
    </div>
  );
};
TimePickerBase.defaultProps = defaultTimePickerProps;
export default TimePickerBase;
