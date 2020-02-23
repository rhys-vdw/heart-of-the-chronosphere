import { h, Component } from "preact";
import { MazeOptions } from "../utility/mazeGenerator";
import { lowerCase, endsWith } from "lodash";
import { Button } from "./Button";
import * as styles from "./MazeGenerationForm.css";

interface Props {
  initialValues: MazeOptions;
  onChange: (values: MazeOptions) => void;
}

interface State {
  values: MazeOptions;
}

export class MazeGenerationForm extends Component<Props, State> {
  state = { values: this.props.initialValues };

  private handleInput = (key: keyof MazeOptions) => (event: Event) => {
    this.setState(({ values }) => ({
      values: {
        ...values,
        [key]: parseFloat((event.target as HTMLInputElement).value)
      }
    }));
  };

  private handleSubmit = () => {
    this.props.onChange(this.state.values);
  };

  render() {
    const { values } = this.state;
    return (
      <form
        style={styles.container}
        action="javascript:void 0"
        onSubmit={this.handleSubmit}
      >
        {Object.entries(values).map(([key, value]) => (
          <div className={styles.container}>
            <label className={styles.column} for={key}>
              {lowerCase(key)}
            </label>
            <input
              id={key}
              className={`${styles.column} ${styles.input}`}
              step={endsWith(key, "Count") ? undefined : 0.1}
              type="number"
              value={value}
              onInput={this.handleInput(key as keyof MazeOptions)}
            />
          </div>
        ))}
        <Button>Generate</Button>
      </form>
    );
  }
}
