import { isElement } from 'react-is';
import cn from 'classnames';
import { Children } from 'react';
import isNil from '../utils/isNil';
import noop from '../utils/noop';
import LazyMount from '../utils/component/LazyMount';
import TabPanel from './components/TabPanel';
import {
  IInnerTab,
  ITabsProps,
  ITabPanelProps,
  TabType,
  ITabsNavProps,
  ITab,
} from './types';
import NormalTabsNav from './components/tabs-nav/NormalTabsNav';
import CardTabsNav from './components/tabs-nav/CardTabsNav';
import ButtonTabsNav from './components/tabs-nav/ButtonTabsNav';
import BaseTabs from './components/base/BaseTabs';
import { getTabDataFromChild } from './utils';

const TabsNavComponents: {
  [type in TabType]?: React.ComponentType<
    React.PropsWithChildren<ITabsNavProps<any>>
  >;
} = {
  normal: NormalTabsNav,
  card: CardTabsNav,
  button: ButtonTabsNav,
};

type ITabsInnerProps<Id extends string | number = string> = Required<
  ITabsProps<Id>
>;

export class Tabs<Id extends string | number = string> extends BaseTabs<
  Id,
  IInnerTab<Id>,
  ITabPanelProps<Id>,
  ITabsProps<Id>
> {
  static TabPanel = TabPanel;

  static defaultProps: Partial<ITabsProps<string>> = {
    type: 'normal',
    activeId: '',
    candel: false,
    canFixed: false,
    stretch: false,
    onChange: noop,
    onDelete: noop,
    unmountPanelOnHide: false,
  };

  get tabsCls() {
    const { className, type } = this.props;
    return cn('zent-tabs', `zent-tabs-type__${type}`, className);
  }

  getTabDataListFromTabs(
    tabs: NonNullable<Array<ITab<Id>>>
  ): Array<IInnerTab<Id>> {
    const { activeId } = this.props;

    return tabs.map<IInnerTab<Id>>(tab => ({
      ...tab,
      actived: tab.key === activeId,
    }));
  }

  getTabDataListFromChildren(
    children: NonNullable<ITabsProps<Id>['children']>
  ): Array<IInnerTab<Id>> {
    const { activeId } = this.props;

    return Children.map(
      children,
      (
        child: React.ReactElement<React.PropsWithChildren<ITabPanelProps<Id>>>
      ) => {
        if (!isElement(child)) {
          return null;
        }
        return getTabDataFromChild(child, activeId);
      }
    ).filter(v => !isNil(v));
  }

  renderNav(tabDataList: Array<IInnerTab<Id>>) {
    const {
      type,
      candel,
      canFixed,
      fixedIds,
      onFixedChange,
      stretch,
      navExtraContent,
      onChange,
      onDelete,
      onAdd,
      overflowMode,
      activeId,
      renderTabBar,
    } = this.props as ITabsInnerProps<Id>;

    const TabsNavComp = (TabsNavComponents[type] ||
      TabsNavComponents['normal']) as React.ComponentClass<ITabsNavProps<Id>>;

    const tabNavProps: ITabsNavProps<Id> = {
      onChange,
      tabDataList,
      onDelete,
      onAdd,
      candel,
      canFixed,
      stretch,
      overflowMode,
      navExtraContent,
      type,
      activeId,
      onFixedChange,
    };

    if ('fixedIds' in this.props) {
      tabNavProps.fixedIds = fixedIds;
    }

    if (renderTabBar) {
      return renderTabBar(tabNavProps, TabsNavComp);
    }

    return <TabsNavComp {...tabNavProps} />;
  }

  renderTabPanel(tabItem: IInnerTab<Id>) {
    const { unmountPanelOnHide, disableLazyMount } = this.props;
    return (
      <LazyMount mount={disableLazyMount || tabItem.actived} key={tabItem.key}>
        <TabPanel
          tab={tabItem.title}
          actived={tabItem.actived}
          unmountOnHide={tabItem.unmountOnHide || unmountPanelOnHide}
          className={tabItem.className}
          id={tabItem.key}
        >
          {tabItem.panelChildren}
        </TabPanel>
      </LazyMount>
    );
  }
}

export default Tabs;
