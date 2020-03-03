import { h, Component } from "preact";
import { lowerCase, endsWith } from "lodash";
import { Button } from "./Button";
import * as styles from "./Form.css";

interface Props<T> {
  initialValues: T;
  onChange: (values: T) => void;
  submitVerb: string;
}

interface State<T> {
  values: T;
}

export class Form<T> extends Component<Props<T>, State<T>> {
  state = { values: this.props.initialValues };

  private handleInput = (key: keyof T) => (event: Event) => {
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
    const { submitVerb } = this.props;
    const { values } = this.state;
    return (
      <form
        className={styles.container}
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
              onInput={this.handleInput(key as keyof T)}
            />
          </div>
        ))}
        <Button>{submitVerb}</Button>
      </form>
    );
  }
}
