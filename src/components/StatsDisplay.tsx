import { Component, h, createRef } from "preact";
import { Stats, Ammunition, RangedWeapon } from "../game/Entity";

interface Props {
  readonly stats: Stats;
  readonly ammunition: Ammunition;
  readonly ammoCapacity: number;
}

export class StatsDisplay extends Component<Props> {
  render() {
    const { stats, ammunition, ammoCapacity } = this.props;
    return (
      <div style={{ padding: "1em" }}>
        <p>
          HP: {stats.health} / {stats.maxHealth}
        </p>
        <p>
          Ammo: {ammunition.loaded} / {ammoCapacity}
        </p>
      </div>
    );
  }
}
