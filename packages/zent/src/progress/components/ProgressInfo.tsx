import { IProgressInfoProps } from '../types';
import { Icon } from '../../icon';
import { FC, PropsWithChildren } from 'react';

const ProgressInfo: FC<PropsWithChildren<IProgressInfoProps>> = props => {
  const { type, percent, format, state, color } = props;

  if (state === 'success') {
    return (
      <Icon
        type={type === 'circle' ? 'check' : 'check-circle'}
        style={{ color }}
      />
    );
  }

  if (state === 'exception') {
    return (
      <Icon
        type={type === 'circle' ? 'close' : 'close-circle'}
        style={{ color }}
      />
    );
  }

  return <>{format(percent)}</>;
};

export default ProgressInfo;
