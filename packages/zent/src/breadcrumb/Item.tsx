import { Component, PropsWithChildren } from 'react';

export interface IBreadcrumbItemProps {
  className?: string;
  name?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export class BreadcrumbItem extends Component<
  PropsWithChildren<IBreadcrumbItemProps>
> {
  render() {
    const { href, name, ...others } = this.props;
    if (this.props.children) {
      return this.props.children;
    }
    return href ? (
      <a {...others} href={href}>
        {name}
      </a>
    ) : (
      <span {...others}>{name}</span>
    );
  }
}

export default BreadcrumbItem;
