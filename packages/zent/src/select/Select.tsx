import cx from 'classnames';
import { Component, createRef, ReactNode } from 'react';

import Popover from '../popover';
import TagList, { ISelectTagListProps } from './TagList';
import Option from './Option';
import Search from './Search';
import { DisabledContext, IDisabledContext } from '../disabled';
import WindowEventHandler from '../utils/component/WindowEventHandler';
import Icon from '../icon';
import { TextMark } from '../text-mark';
import { InlineLoading } from '../loading/InlineLoading';
import { Pop } from '../pop';
import { I18nReceiver as Receiver, II18nLocaleSelect } from '../i18n';
import memoize from '../utils/memorize-one';
import uniqueId from '../utils/uniqueId';
import { filterReviver, reviveSelectItem } from './reviver';

// 允许创建的临时 key
const uniqueKey = '__ZENT_SELECT_CREATABLE_KEY__';
const SELECT_CREATABLE_KEY = uniqueId(uniqueKey);

export interface ISelectItem<Key extends string | number = string | number> {
  key: Key;
  text: React.ReactNode;
  disabled?: boolean;
  type?: 'header' | 'divider' | 'reviver';
  reviver?: (item: ISelectItem<Key>) => ISelectItem<Key> | null;
}

export interface IOptionRenderer<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
> {
  (item: Item, index: number): React.ReactNode;
}

export interface ISelectKeywordChangeMeta {
  source: 'user-clear' | 'user-change' | 'popup-close' | 'option-create';
}

export type ISelectSize = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface ISelectCommonProps<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
> {
  keyword?: string;
  onKeywordChange?: (keyword: string, meta: ISelectKeywordChangeMeta) => void;
  options: Item[];
  isEqual?: (a: Item, b: Item) => boolean;
  placeholder?: string;
  notFoundContent?: string;
  inline?: boolean;
  width?: React.CSSProperties['width'];
  size?: ISelectSize;
  popupWidth?: React.CSSProperties['width'];
  filter?: ((keyword: string, item: Item) => boolean) | false;
  highlight?: (keyword: string, item: Item) => Item;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderValue?: (value: Item) => React.ReactNode;
  renderOptionList?: (
    options: Item[],
    renderOption: IOptionRenderer<Key, Item>
  ) => React.ReactNode;
  renderOptionContent?: (value: Item) => React.ReactNode;
  clearable?: boolean;
  loading?: boolean;
  creatable?: boolean;
  onCreate?: (text: string) => Promise<void>;
  isValidNewOption?: (keyword: string, options: Item[]) => boolean;
  collapsable?: boolean;
  collapseAt?: number;
  hideCollapsePop?: boolean;
  className?: string;
  disableSearch?: boolean;
  renderCollapsedContent?: (collapsedValue: Item[]) => React.ReactNode;
}

export interface ISelectSingleProps<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
> extends ISelectCommonProps<Key, Item> {
  multiple?: false;
  value?: Item | null;
  onChange?: (value: Item | null) => void;
}

export interface ISelectMultiProps<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
> extends ISelectCommonProps<Key, Item> {
  multiple: true;
  value?: Item[];
  onChange?: (value: Item[]) => void;
  renderTagList?: (props: ISelectTagListProps<Key, Item>) => React.ReactNode;
}

export type ISelectProps<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
> = ISelectMultiProps<Key, Item> | ISelectSingleProps<Key, Item>;

export interface ISelectState<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
> {
  open: boolean;
  active: boolean;
  keyword: string;

  /**
   *  This is the value used for rendering even when componnet is in controlled mode
   */
  value: null | Item | Item[];

  activeIndex: null | number;
  prevOptions: Item[];
  creating: boolean;

  // Keep track of trigger DOM node width
  triggerWidth: React.CSSProperties['width'];
}

function defaultIsEqual<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(a: Item, b: Item) {
  return a.key === b.key;
}

function defaultFilter<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(keyword: string, option: Item): boolean {
  if (typeof option.text !== 'string') {
    return true;
  }
  return option.text.toLowerCase().includes(keyword.toLowerCase());
}

function defaultRenderOptionList<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(options: Item[], renderOption: IOptionRenderer<Key, Item>) {
  return options.map(renderOption);
}

// 获取creatable下需要增加的options
function getExtraOptions<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(value: Item | Item[] | undefined) {
  if (!Array.isArray(value)) {
    if (value?.key?.toString()?.indexOf(uniqueKey) > -1) {
      return [value];
    }
    return [];
  }
  return value.reduce((v, next) => {
    if (next?.key?.toString()?.indexOf(uniqueKey) > -1) {
      return [...v, next];
    }
    return v;
  }, []);
}

function isSelectable<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(item: Item) {
  return !!item && !item.disabled && !item.type;
}

function findNextSelectableOption<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(options: Item[], start: number): number | null {
  for (let i = start; i < options.length; i += 1) {
    if (isSelectable<Key>(options[i])) {
      return i;
    }
  }
  return null;
}

function findPrevSelectableOption<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(options: Item[], start: number) {
  for (let i = start; i >= 0; i -= 1) {
    if (isSelectable<Key>(options[i])) {
      return i;
    }
  }
  return null;
}

function defaultHighlight<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
>(keyword: string, option: Item): React.ReactNode {
  if (typeof option.text !== 'string') {
    return option.text;
  }

  return (
    <TextMark
      searchWords={[keyword]}
      textToHighlight={option.text}
      highlightStyle={{ backgroundColor: 'initial', color: '#155bd4' }}
      autoEscape
    />
  );
}

const DEFAULT_LOADING = (
  <div className="zent-select-v2-popup-loading">
    <InlineLoading
      loading
      icon="circle"
      iconSize={18}
      iconText="加载中…"
      textPosition="right"
      colorPreset="grey"
    />
  </div>
);

function defaultIsValidNewOption<Key extends string | number = string | number>(
  keyword: string,
  options: ISelectItem<Key>[]
): boolean {
  return options.every(
    it =>
      (typeof it.text === 'string' ? it.text.toLowerCase() : it.text) !==
      keyword.toLowerCase()
  );
}

const DEFAULT_TRIGGER_WIDTH = 240;

const DEFAULT_SIZE_WIDTH = 116;
const DEFAULT_PADDING_WIDTH = 8;

const SIZE_MAP = {
  xs: DEFAULT_SIZE_WIDTH,
  s: DEFAULT_SIZE_WIDTH * 2 + DEFAULT_PADDING_WIDTH,
  m: DEFAULT_SIZE_WIDTH * 3 + DEFAULT_PADDING_WIDTH * 2,
  l: DEFAULT_SIZE_WIDTH * 4 + DEFAULT_PADDING_WIDTH * 3,
  xl: DEFAULT_SIZE_WIDTH * 5 + DEFAULT_PADDING_WIDTH * 4,
};

export class Select<
  Key extends string | number = string | number,
  Item extends ISelectItem<Key> = ISelectItem<Key>
> extends Component<ISelectProps<Key, Item>, ISelectState<Key, Item>> {
  static defaultProps = {
    isEqual: defaultIsEqual,
    renderOptionList: defaultRenderOptionList,
    filter: defaultFilter,
    isValidNewOption: defaultIsValidNewOption,
    highlight: defaultHighlight,
    size: 's',
    multiple: false,
    clearable: false,
    loading: false,
    creatable: false,
  };

  static contextType = DisabledContext;

  static reviveValue = reviveSelectItem;

  context!: IDisabledContext;

  triggerRef = createRef<HTMLDivElement>();
  popoverRef = createRef<Popover>();
  inputRef = createRef<HTMLInputElement>();

  constructor(props: ISelectProps<Key, Item>) {
    super(props);

    let value: null | Item | Item[];
    if (props.multiple) {
      value = filterReviver<Key, Item>(props.value ?? []);
    } else {
      value = filterReviver<Key, Item>(props.value ?? null);
    }
    const { keyword, width, options, size } = props;
    this.state = {
      keyword: keyword ?? '',
      value,
      open: false,
      active: false,
      activeIndex: null,
      prevOptions: options,
      creating: false,
      triggerWidth: width ?? (SIZE_MAP[size] || DEFAULT_TRIGGER_WIDTH),
    };

    this.tryReviveOption(props);
  }

  static getDerivedStateFromProps<
    Key extends string | number = string | number,
    Item extends ISelectItem<Key> = ISelectItem<Key>
  >(
    props: ISelectProps<Key, Item>,
    state: ISelectState<Key, Item>
  ): Partial<ISelectState<Key, Item>> | null {
    const nextState: Partial<ISelectState<Key, Item>> = {
      prevOptions: props.options,
    };
    if (typeof props.keyword === 'string') {
      nextState.keyword = props.keyword;
    }

    if (typeof props.open === 'boolean') {
      nextState.open = props.open;
      nextState.active = props.open;
    }

    if (props.multiple) {
      if (Array.isArray(props.value)) {
        nextState.value = filterReviver<Key, Item>(props.value);
      }
    } else {
      if ('value' in props) {
        nextState.value = filterReviver<Key, Item>(props.value ?? null);
      }
    }

    if (props.options !== state.prevOptions && state.activeIndex !== null) {
      if (!props.options.length) {
        nextState.activeIndex = null;
      } else {
        if (state.activeIndex >= props.options.length) {
          nextState.activeIndex = props.options.length - 1;
        }
      }
    }
    return nextState;
  }

  componentDidMount() {
    if ('popupWidth' in this.props) {
      return;
    }
    const { size, width } = this.props;
    const sizeWidth = SIZE_MAP[size] || DEFAULT_TRIGGER_WIDTH;
    const useWidth = typeof width === 'number' ? width : sizeWidth;

    const triggerWidth = this.triggerRef.current?.offsetWidth || useWidth;

    this.setState({
      triggerWidth,
    });
  }

  componentDidUpdate(prevProps: ISelectProps<Key, Item>) {
    if (
      this.props.options !== prevProps.options ||
      this.props.value !== prevProps.value
    ) {
      this.tryReviveOption(this.props);
    }
  }

  get disabled() {
    const { disabled = this.context.value } = this.props;
    return disabled;
  }

  tryReviveOption(props: ISelectProps<Key, Item>) {
    const { options } = props;

    if (props.multiple) {
      const value = props.value ?? [];
      let revived = false;
      const newValue = value.map(v => {
        if (v.type === 'reviver') {
          for (const opt of options) {
            const revivedOpt = v.reviver?.(opt);
            if (revivedOpt) {
              revived = true;
              return revivedOpt as Item;
            }
          }
        }

        return v;
      });

      if (revived) {
        if (props.onChange) {
          props.onChange(newValue);
        } else {
          this.setState({ value: newValue });
        }
      }
    } else if (props.multiple === false) {
      const value = props.value ?? null;
      if (value?.type === 'reviver') {
        let revivedOpt: Item | null = null;
        for (const opt of options) {
          revivedOpt = value.reviver?.(opt) as Item;
          if (revivedOpt) {
            break;
          }
        }

        if (revivedOpt) {
          if (props.onChange) {
            props.onChange?.(revivedOpt);
          } else {
            this.setState({ value: revivedOpt });
          }
        }
      }
    }
  }

  onVisibleChange = (open: boolean) => {
    if (this.disabled) {
      return;
    }
    const { onOpenChange } = this.props;
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      this.setState({
        open,
        active: open,
        activeIndex: null,
      });
    }

    // 关闭时清空搜索内容
    if (open === false) {
      this.resetKeyword('popup-close');
    }
  };

  onSelect = (item: Item) => {
    if (!item || item.disabled || item.type || this.disabled) {
      return;
    }

    const { onCreate } = this.props;
    const isCreate = item.key === SELECT_CREATABLE_KEY;
    if (isCreate && onCreate) {
      this.onCreateClick();
      return;
    }
    isCreate && this.resetKeyword('option-create');
    const valueItem = isCreate ? { ...item, key: uniqueId(uniqueKey) } : item;
    if (this.props.multiple === true) {
      const { onChange, isEqual } = this.props;
      const value = this.state.value as Item[];
      const valueIndex = value.findIndex(it => isEqual(it, item));
      this.focusSearchInput();
      const nextValue =
        valueIndex >= 0
          ? value.filter((_it, index) => index !== valueIndex)
          : value.concat([valueItem]);

      if (onChange) {
        onChange(nextValue);
      } else {
        this.setState({ value: nextValue });
      }
    } else {
      this.onVisibleChange(false);
      const { onChange } = this.props;
      if (onChange) {
        onChange(valueItem);
      } else {
        this.setState({ value: valueItem });
      }
    }
  };

  onKeywordChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    if (this.disabled) {
      return;
    }
    this.setKeyword(e.target.value, 'user-change');
  };

  resetKeyword(source: ISelectKeywordChangeMeta['source']) {
    this.setKeyword('', source);
  }

  setKeyword(keyword: string, source: ISelectKeywordChangeMeta['source']) {
    const { onKeywordChange } = this.props;
    if (onKeywordChange) {
      onKeywordChange(keyword, { source });
    } else {
      this.setState({
        keyword,
      });
    }
  }

  onRemove = (item: Item) => {
    if (this.disabled) {
      return;
    }

    const { value } = this.state;
    const { onChange, isEqual } = this.props as ISelectMultiProps<Key, Item>;
    const nextValue = (value as Item[]).filter(it => !isEqual(item, it));
    this.focusSearchInput();
    if (onChange) {
      onChange(nextValue);
    } else {
      this.setState({
        value: nextValue,
      });
    }
  };

  onOptionMouseEnter = (index: number) => {
    if (this.disabled) {
      return;
    }
    this.setState({
      activeIndex: index,
    });
  };

  onOptionMouseLeave = (index: number) => {
    if (this.disabled) {
      return;
    }
    this.setState(state =>
      state.activeIndex === index
        ? {
            activeIndex: null,
          }
        : null
    );
  };

  selectCurrentIndex = () => {
    if (this.disabled) {
      return;
    }
    const { activeIndex, keyword, value } = this.state;
    const {
      creatable,
      options: _options,
      filter,
      isValidNewOption,
    } = this.props;

    const options = this.filterOptions(
      keyword,
      _options,
      filter,
      creatable,
      isValidNewOption,
      value
    );
    if (activeIndex !== null) {
      this.onSelect(options[activeIndex]);
    } else {
      // 没有activeIndex且第一项为create，则自动创建
      if (options.length && options[0]?.key === SELECT_CREATABLE_KEY) {
        this.onSelect(options[0]);
      }
    }
  };

  renderOption: IOptionRenderer<Key, Item> = (option: Item, index: number) => {
    const { isEqual, multiple, renderOptionContent, highlight, filter } =
      this.props;
    const { value, activeIndex, creating } = this.state;
    const selected =
      !!value &&
      (multiple
        ? (value as Item[]).findIndex(it => isEqual(it, option)) >= 0
        : isEqual(value as Item, option));

    let optionContent: React.ReactNode = null;
    let loading = false;
    if (option.key === SELECT_CREATABLE_KEY) {
      loading = creating;
      optionContent = (
        <Receiver componentName="Select">
          {i18n => (
            <span className="zent-select-v2-option-text-highlight">
              {i18n.create}
              {option.text}
            </span>
          )}
        </Receiver>
      );
    } else if (renderOptionContent) {
      optionContent = renderOptionContent(option);
    } else {
      const keyword = this.state.keyword.trim();
      optionContent = (
        filter !== false && keyword.length > 0
          ? highlight?.(keyword, option)
          : option.text
      ) as ReactNode;
    }

    return (
      <Option
        key={option.key}
        value={option}
        selected={selected}
        active={index === activeIndex}
        onSelect={this.onSelect}
        index={index}
        onMouseEnter={this.onOptionMouseEnter}
        onMouseLeave={this.onOptionMouseLeave}
        multiple={multiple}
        loading={loading}
      >
        {optionContent}
      </Option>
    );
  };

  globalClick = (e: MouseEvent) => {
    if (
      this.disabled ||
      this.state.open ||
      !this.state.active ||
      !this.triggerRef.current ||
      !this.popoverRef.current
    ) {
      return;
    }
    if (!this.triggerRef.current?.contains(e.target as Element)) {
      this.setState({
        active: false,
      });
    }
  };

  onIndexChange = (delta: 1 | -1) => {
    if (this.disabled) {
      return;
    }
    this.setState(
      (state, { options: _options, creatable, filter, isValidNewOption }) => {
        const options = this.filterOptions(
          state.keyword,
          _options,
          filter,
          creatable,
          isValidNewOption,
          state.value
        );

        let nextIndex: number;
        if (state.activeIndex === null) {
          if (delta < 0) {
            nextIndex = options.length - 1;
          } else {
            nextIndex = 0;
          }
        } else {
          nextIndex = (state.activeIndex + delta) % options.length;
        }
        if (nextIndex >= options.length) {
          nextIndex = options.length - 1;
        }
        if (nextIndex < 0) {
          nextIndex = 0;
        }
        if (!isSelectable<Key, Item>(options[nextIndex])) {
          let enabled: number | null;
          if (delta > 0) {
            enabled = findNextSelectableOption<Key, Item>(options, nextIndex);
          } else {
            enabled = findPrevSelectableOption<Key, Item>(options, nextIndex);
          }
          if (!enabled) {
            return null;
          }
          nextIndex = enabled;
        }
        if (state.activeIndex === nextIndex) {
          return null;
        }
        return {
          activeIndex: nextIndex,
        };
      }
    );
  };

  renderValue(i18n: II18nLocaleSelect) {
    const { placeholder, renderValue, multiple } = this.props;
    const { open } = this.state;

    if (multiple) {
      const value = this.state.value as Item[];

      if (value?.length > 0) {
        return this.renderTagList(value, i18n);
      }

      if (open) {
        return null;
      }
    } else {
      if (open) {
        return null;
      }
      const value = this.state.value as Item | null;
      if (value) {
        return renderValue ? (
          renderValue(value)
        ) : (
          <span
            className="zent-select-v2-text"
            title={typeof value.text === 'string' ? value.text : ''}
          >
            {value.text}
          </span>
        );
      }
    }

    return <span className="zent-select-v2-placeholder">{placeholder}</span>;
  }

  renderTagCollapsedTrigger(value: Item[]) {
    return (
      <span className="zent-select-v2-tag-collapsed-trigger">
        +{value.length}
      </span>
    );
  }

  renderTagList(value: Item[], i18n: II18nLocaleSelect) {
    const {
      renderValue,
      renderTagList,
      collapsable,
      hideCollapsePop,
      collapseAt = 1,
      renderCollapsedContent,
    } = this.props as ISelectMultiProps<Key, Item>;
    const tagsValue = collapsable ? value.slice(0, collapseAt) : value;
    const collapsedValue = value.slice(collapseAt);

    return (
      <>
        {typeof renderTagList === 'function' ? (
          renderTagList({
            list: value,
            onRemove: this.onRemove,
            renderValue: renderValue as any,
          })
        ) : (
          <TagList
            list={tagsValue}
            onRemove={this.onRemove}
            renderValue={renderValue as any}
          />
        )}
        {collapsable &&
          collapsedValue.length > 0 &&
          (!hideCollapsePop ? (
            <Pop
              trigger="hover"
              position="auto-top-center"
              cushion={15}
              content={
                <div className="zent-select-v2-tag-collapsed-content">
                  <div>
                    {typeof renderCollapsedContent === 'function'
                      ? renderCollapsedContent(collapsedValue)
                      : collapsedValue.map((item, index) => {
                          return (
                            <span key={item.key}>
                              {renderValue ? renderValue(item) : item.text}
                              {index !== collapsedValue.length - 1 &&
                                i18n.tagSeparator}
                            </span>
                          );
                        })}
                  </div>
                </div>
              }
            >
              {this.renderTagCollapsedTrigger(collapsedValue)}
            </Pop>
          ) : (
            this.renderTagCollapsedTrigger(collapsedValue)
          ))}
      </>
    );
  }

  getSearchPlaceholder(): string {
    const { placeholder } = this.props;
    if (this.props.multiple) {
      if ((this.state.value as Item[]).length) {
        return '';
      }
      return placeholder ?? '';
    }
    const value = this.state.value as Item | null;
    if (!value || typeof value.text !== 'string') {
      return placeholder ?? '';
    }
    return value.text;
  }

  onClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { keyword } = this.state;
    this.focusSearchInput();

    if (keyword) {
      this.resetKeyword('user-clear');
      return;
    }

    if (this.props.multiple) {
      const { onChange } = this.props as ISelectMultiProps<Key, Item>;
      const value: Item[] = [];
      if (onChange) {
        onChange(value);
      } else {
        this.setState({
          value,
        });
      }
    } else {
      const { onChange } = this.props as ISelectSingleProps<Key, Item>;
      const value = null;
      if (onChange) {
        onChange(value);
      } else {
        this.setState({
          value,
        });
      }
    }
  };

  onCreateClick = () => {
    const { onCreate, multiple } = this.props;
    const { keyword } = this.state;

    if (onCreate) {
      this.setState({ creating: true });

      onCreate(keyword.trim())
        .then(() => {
          if (multiple) {
            this.focusSearchInput();
          } else {
            this.onVisibleChange(false);
          }
          this.resetKeyword('option-create');
        })
        .finally(() => {
          this.setState({ creating: false });
        });
    }
  };

  filterOptions = memoize(
    (
      keyword: string,
      options: Item[] = [],
      filter: ((keyword: string, item: Item) => boolean) | false,
      creatable: boolean,
      isValidNewOption: (keyword: string, options: Item[]) => boolean,
      value: Item | Item[] | undefined
    ): Item[] => {
      const extraOptions = creatable ? getExtraOptions(value) : [];
      const mergedOptions = [...options, ...extraOptions];

      const filtered =
        filter !== false && keyword
          ? mergedOptions.filter(it => filter?.(keyword, it))
          : mergedOptions;

      const pendingCreateOption =
        creatable && keyword && isValidNewOption?.(keyword, mergedOptions)
          ? [
              {
                key: SELECT_CREATABLE_KEY,
                text: keyword,
              },
            ]
          : [];

      return (pendingCreateOption as Item[]).concat(filtered);
    }
  );

  focusSearchInput = () => {
    // 命令式聚焦搜索框
    this.inputRef?.current?.focus();
  };

  renderPopoverContent(i18n: II18nLocaleSelect): React.ReactNode {
    const {
      notFoundContent,
      renderOptionList,
      loading,
      creatable,
      options,
      filter,
      isValidNewOption,
    } = this.props;
    const keyword = this.state.keyword.trim();
    const value = this.state.value;

    if (loading) {
      return DEFAULT_LOADING;
    }

    const filtered = this.filterOptions(
      keyword,
      options,
      filter,
      creatable,
      isValidNewOption,
      value
    );
    return filtered?.length ? (
      renderOptionList(filtered, this.renderOption)
    ) : (
      <div className="zent-select-v2-popup-empty">
        {notFoundContent ?? i18n.empty}
      </div>
    );
  }

  render() {
    const { keyword, open: visible, active, value, triggerWidth } = this.state;
    const {
      inline,
      width,
      clearable,
      multiple,
      popupWidth,
      collapsable,
      className,
      disableSearch,
      size,
      collapseAt,
    } = this.props;

    const notEmpty = multiple
      ? Array.isArray(value) && value.length > 0
      : value;
    const showClear = clearable && !this.disabled && (keyword || notEmpty);

    return (
      <>
        <Receiver componentName="Select">
          {i18n => (
            <Popover
              ref={this.popoverRef}
              position={Popover.Position.AutoBottomLeft}
              visible={visible}
              onVisibleChange={this.onVisibleChange}
              className="zent-select-v2-popup"
              style={{ width: popupWidth ?? triggerWidth }}
              cushion={4}
            >
              <Popover.Trigger.Click>
                <div
                  ref={this.triggerRef}
                  className={cx(
                    'zent-select-v2',
                    `zent-select-v2-${size}`,
                    className,
                    {
                      'zent-select-v2-inline': inline,
                      'zent-select-v2-active': active,
                      'zent-select-v2-visible': visible,
                      'zent-select-v2-disabled': this.disabled,
                      'zent-select-v2-clearable': showClear,
                      'zent-select-v2-multiple': multiple,
                      'zent-select-v2-collapsable': collapsable,
                      'zent-select-v2-collapsable-single': collapseAt === 1,
                    }
                  )}
                  style={{ width }}
                  onClick={this.focusSearchInput}
                >
                  {this.renderValue(i18n)}
                  {showClear && (
                    <Icon type="close-circle" onClick={this.onClear} />
                  )}
                  {!disableSearch && visible && (
                    <Search
                      placeholder={this.getSearchPlaceholder()}
                      value={keyword}
                      autoWidth={multiple}
                      onChange={this.onKeywordChange}
                      onIndexChange={this.onIndexChange}
                      onEnter={this.selectCurrentIndex}
                      ref={this.inputRef}
                    />
                  )}
                  <Icon type="down" />
                </div>
              </Popover.Trigger.Click>
              <Popover.Content>
                {this.renderPopoverContent(i18n)}
              </Popover.Content>
            </Popover>
          )}
        </Receiver>
        <WindowEventHandler
          eventName="click"
          listener={this.globalClick}
          options={{ capture: true }}
        />
      </>
    );
  }
}

export default Select;
