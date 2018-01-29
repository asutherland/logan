import React from 'react';
import ReactDOM from 'react-dom';

import NotebookContainer from '../notebook-ui/components/Container.jsx';

import SearchFieldSheet from './components/sheets/search_field.jsx';

import GrokAnalysisFrontend from '../grokysis/frontend.js';

import './grok-ui.css';
import '../notebook-ui/notebook-ui.css';

/**
 * The UI is a
 */
class GrokApp extends React.Component {
  constructor(props) {
    super(props);

    const grokCtx = new GrokAnalysisFrontend('main');

    this.state = {
      grokCtx,
      initialSheets: [
        {
          label: 'Searchfox Search',
          awaitContent: null,
          contentFactory: (props) => {
            return <SearchFieldSheet {...props} />;
          }
        }
      ]
    };
  }

  render() {
    return (
      <NotebookContainer
        grokCtx={ this.state.grokCtx }
        />
    );
  }
}

const contentNode = document.createElement('div');
contentNode.className = 'grok-ui-root';
document.body.appendChild(contentNode);
ReactDOM.render(<GrokApp />, contentNode);