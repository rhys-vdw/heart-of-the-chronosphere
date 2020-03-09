import { Component, h, createRef } from "preact";
import * as styles from "./EventLog.css";
import { GameEvent } from "../game/Game";

interface Props {
  readonly events: readonly GameEvent[];
}

interface State {
  readonly autoScroll: boolean;
}

export class EventLog extends Component<Props, State> {
  state: State = {
    autoScroll: true
  };

  private scrollableElementRef = createRef<HTMLElement>();

  private handleScroll = (event: UIEvent) => {
    const element = this.scrollableElementRef.current!;
    this.setState({
      autoScroll:
        element.scrollHeight - element.clientHeight <= element.scrollTop + 1
    });
  };

  componentDidUpdate() {
    if (this.state.autoScroll) {
      const element = this.scrollableElementRef.current!;
      element.scrollTop = element.scrollHeight - element.clientHeight;
    }
  }

  render() {
    return (
      <div
        ref={this.scrollableElementRef}
        onScroll={this.handleScroll}
        className={styles.container}
      >
        <ol className={styles.list}>
          <li>
            <p>
              You must exit the Chronosphere through the stairs in the top
              level.
            </p>
            <p>
              Shoot—mouse left
              <br />
              Reload—mouse right
              <br />
              Rest—space
            </p>
          </li>
          {this.props.events.map(e => (
            <li>{e.message}</li>
          ))}
        </ol>
      </div>
    );
  }
}
