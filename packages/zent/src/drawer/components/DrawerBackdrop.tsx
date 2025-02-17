import { CSSTransition } from 'react-transition-group';

import { IDrawerBackdrop } from '../types';
import { TransitionTimeOut } from '../constants';
import { FC, PropsWithChildren } from 'react';

const DrawerBackdrop: FC<PropsWithChildren<IDrawerBackdrop>> = ({
  mask,
  maskClosable,
  visible,
  onClose,
}) => {
  const onMaskClick = () => {
    if (mask && maskClosable) {
      onClose();
    }
  };

  return (
    <CSSTransition
      appear
      mountOnEnter
      unmountOnExit
      in={visible && mask}
      timeout={TransitionTimeOut}
      classNames="zent-drawer-transition__backdrop"
    >
      <div className="zent-drawer-backdrop" onClick={onMaskClick} />
    </CSSTransition>
  );
};

export default DrawerBackdrop;
