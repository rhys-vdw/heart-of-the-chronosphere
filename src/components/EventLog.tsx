import { Component, h, createRef } from "preact";
import * as styles from "./EventLog.css";

interface Props {
  readonly events: readonly string[];
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
    console.log("top", element.scrollTop, "height", element.scrollHeight);
    this.setState({
      autoScroll:
        element.scrollHeight - element.clientHeight <= element.scrollTop + 1
    });
  };

  componentDidUpdate() {
    console.log("componentDidUpdate", this.state.autoScroll);
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
          {this.props.events.map(e => (
            <li>{e}</li>
          ))}
        </ol>
      </div>
    );
  }
}
