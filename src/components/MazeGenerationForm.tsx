import { h, Component } from "preact";
import { MazeOptions } from "../utility/mazeGenerator";
import { lowerCase, endsWith } from "lodash";
import { Button } from "./Button";

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
        style={{ padding: "0.3em" }}
        action="javascript:void 0"
        onSubmit={this.handleSubmit}
      >
        {Object.entries(values).map(([key, value]) => (
          <div style={{ padding: "0.3em" }}>
            <label style={{ display: "inline-block", width: "50%" }} for={key}>
              {lowerCase(key)}
            </label>
            <input
              id={key}
              style={{ display: "inline-block", width: "50%" }}
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
