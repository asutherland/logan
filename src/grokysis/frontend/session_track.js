import EE from 'eventemitter3';

import SessionThing from './session_thing.js';

/**
 * Holds persisted SessionThings.  In turn held by a SessionManager which holds
 * multiple SessionTracks.  SessionNotebookContainer widgets bind to the track
 * and listen for changes in the list of things (additions/removals), but not
 * mutations of those session things.  Each SessionThing is expected to be
 * bound to by an independently stateful widget.
 */
export default class SessionTrack extends EE {
  constructor(manager, name) {
    super();

    this.manager = manager;
    this.name = name;
    this.things = [];

    this.serial = 0;
  }

  /**
   * Updates all session things' disk representations whenever any of them
   * change.  Currently, their `index` is literally their index in the array.
   * We really only need to update the things after the injected thing, but this
   * way is safer if the index rep is changed in SessionManager.
   */
  _updatePersistedThingsBecauseOfOrderingChange(newThingToIgnore) {
    for (const thing of this.things) {
      // We can skip the thing we just wrote.
      if (thing !== newThingToIgnore) {
        this.updatePersistedState(thing, thing.persisted);
      }
    }
  }

  addThing(relThing, useId, { position, type, persisted, restored }) {
    if (!useId) {
      // (an id of 0 is never used, so we won't ambiguously end up in here)
      useId = this.manager.allocId();
    }

    let targetIdx;
    if (relThing === null || position === 'end') {
      targetIdx = this.things.length;
    } else {
      targetIdx = this.things.indexOf(relThing);
      if (targetIdx === -1) {
        targetIdx = this.things.length;
      } else if (position && position === 'after') {
        // otherwise we're placing it before by using the existing sheet's
        // index.
        targetIdx++;
      }
    }

    const orderingChange = targetIdx < this.things.length;

    const bindingFactory = this.manager.bindings[type];
    if (typeof(bindingFactory) !== 'function') {
      console.warn("bindingFactory not a function:", bindingFactory, "for type",
                   type);
      throw new Error("binding factory wasn't a function");
    }

    const thing = new SessionThing(this, useId, type, bindingFactory,
                                   persisted);
    this.things.splice(targetIdx, 0, thing);
    // Write-through to the database if this didn't come from the database.
    if (!restored) {
      this.updatePersistedState(thing, persisted);
    }

    if (orderingChange) {
      this._updatePersistedThingsBecauseOfOrderingChange();
    }

    this.serial++;
    this.emit('dirty', this);

    return thing;
  }

  /**
   * Remove the given SessionThing from the track if it's still present.
   */
  removeThing(thing) {
    const idx = this.things.indexOf(thing);
    if (idx !== -1) {
      this.things.splice(idx, 1);
      this.manager.sessionThingRemoved(thing);

      this.serial++;
      this.emit('dirty', this);
    }
  }

  updatePersistedState(thing, newState) {
    this.manager.updatePersistedState(this, thing, newState);
  }
}
