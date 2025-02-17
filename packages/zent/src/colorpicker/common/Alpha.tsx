import { Component, createRef, PropsWithChildren } from 'react';
import reactCSS from '../helpers/reactcss';
import * as alpha from '../helpers/alpha';
import Checkboard from './Checkboard';
import { addEventListener } from '../../utils/component/event-handler';

/**
 * 透明度
 */
export class Alpha extends Component<PropsWithChildren<any>, any> {
  containerRef = createRef<HTMLDivElement>();
  eventCancelList = [] as Array<() => void>;

  componentWillUnmount() {
    this.unbindEventListeners();
  }

  handleChange = (e, skip?: boolean) => {
    const change = alpha.calculateChange(
      e,
      skip,
      this.props,
      this.containerRef.current
    );
    change && this.props.onChange(change, e);
  };

  handleMouseDown = e => {
    this.handleChange(e, true);
    this.eventCancelList.push(
      addEventListener(window, 'mousemove', this.handleChange)
    );
    this.eventCancelList.push(
      addEventListener(window, 'mouseup', this.handleMouseUp, { passive: true })
    );
  };

  handleMouseUp = () => {
    this.unbindEventListeners();
  };

  unbindEventListeners = () => {
    this.eventCancelList.forEach(cancel => cancel());
    this.eventCancelList = [];
  };

  render() {
    const rgb = this.props.rgb;
    const styles: any = reactCSS(
      {
        default: {
          alpha: {
            absolute: '0px 0px 0px 0px',
            borderRadius: this.props.radius,
          },
          checkboard: {
            absolute: '0px 0px 0px 0px',
            overflow: 'hidden',
          },
          gradient: {
            absolute: '0px 0px 0px 0px',
            background: `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b}, 0) 0%,
           rgba(${rgb.r},${rgb.g},${rgb.b}, 1) 100%)`,
            boxShadow: this.props.shadow,
            borderRadius: this.props.radius,
          },
          container: {
            position: 'relative',
            height: '100%',
            margin: '0 3px',
          },
          pointer: {
            position: 'absolute',
            left: `${rgb.a * 100}%`,
          },
          slider: {
            width: '4px',
            borderRadius: '1px',
            height: '8px',
            boxShadow: '0 0 2px rgba(0, 0, 0, .6)',
            background: '#fff',
            marginTop: '1px',
            transform: 'translateX(-2px)',
          },
        },
        vertical: {
          gradient: {
            background: `linear-gradient(to bottom, rgba(${rgb.r},${rgb.g},${rgb.b}, 0) 0%,
           rgba(${rgb.r},${rgb.g},${rgb.b}, 1) 100%)`,
          },
          pointer: {
            left: 0,
            top: `${rgb.a * 100}%`,
          },
        },
        overwrite: {
          ...this.props.style,
        },
      },
      {
        vertical: this.props.direction === 'vertical',
        overwrite: true,
      }
    );

    return (
      <div style={styles.alpha}>
        <div style={styles.checkboard}>
          <Checkboard renderers={this.props.renderers} />
        </div>
        <div style={styles.gradient} />
        <div
          className="alpha-bar"
          style={styles.container}
          ref={this.containerRef}
          onMouseDown={this.handleMouseDown}
          onTouchMove={this.handleChange}
          onTouchStart={this.handleChange}
        >
          <div style={styles.pointer}>
            {this.props.pointer ? (
              <this.props.pointer {...this.props} />
            ) : (
              <div style={styles.slider} />
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default Alpha;
