import React from 'react';
import { Table } from 'semantic-ui-react'

/**
 * Supports faceting and filtering of the current trice.
 *
 * The UI is a table of
 */
export default class TriceFilterSheet extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      log: null
    };

    this.onLogHello = this.onLogHello.bind(this);
  }

  componentWillMount() {
    this.props.sessionThing.handleSlotMessage(
      'triceLog:filters:hello', this.onLogHello);
  }

  componentWillUnmount() {
    this.props.sessionThing.stopHandlingSlotMessage('triceLog:eventFocused');
  }

  onLogHello(log) {
    this.setState({ log });
  }

  render() {
    if (!this.state.log) {
      return <div></div>;
    }

    const tableRows = [];
    // This needs to be a tree-table thing so we can use <li> tags.
    const INDENT_DELTA = 12;
    function renderFacet(facet, indent, parentPath) {
      const fullPath = parentPath + '/' + facet.name;
      const hackyStyle = { paddingLeft: `${indent}px`};
      tableRows.push(
        <Table.Row key={ fullPath }>
          <Table.Cell><span style={ hackyStyle }>{ facet.name }</span></Table.Cell>
          <Table.Cell>{ facet.count }</Table.Cell>
        </Table.Row>
      );

      for (const kidFacet of facet.children) {
        renderFacet(kidFacet, indent + INDENT_DELTA, fullPath);
      }
    }
    for (const topFacet of this.state.log.filterableFacets) {
      renderFacet(topFacet, 0, '');
    }

    return (
      <div>
        <Table celled striped>
          <Table.Body>
            { tableRows }
          </Table.Body>
        </Table>
      </div>
    );
  }
}