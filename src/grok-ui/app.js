import React from 'react';
import ReactDOM from 'react-dom';

import {
  ReflexContainer,
  ReflexSplitter,
  ReflexElement
} from 'react-reflex';

import SessionNotebookContainer from '../components/session/session_notebook_container.jsx';

import SearchFieldSheet from './components/sheets/search_field.jsx';
import SearchResultsSheet from './components/sheets/search_results.jsx';

import GrokAnalysisFrontend from '../grokysis/frontend.js';

import 'semantic-ui-css/semantic.min.css';
import 'react-reflex/styles.css';

import './grok-ui.css';
import '../notebook-ui/notebook-ui.css';

/**
 * Two vertical panes with a splitter between them.  The left pane displays the
 * notebook UI for exploration, the right pane displays the notebook UI for
 * created diagrams/state machines/other intentional documentation artifacts.
 * Since I also have portrait monitors, a horizontal pane configuration may
 * eventually show up.
 */
class GrokApp extends React.Component {
  constructor(props) {
    super(props);

    const grokCtx = new GrokAnalysisFrontend({
      // For now, there's just a single session.
      session: {
        name: 'main',
        tracks: ['exploration', 'analysis'],
        defaults: {
          exploration: [
            {
              type: 'searchField',
              persisted: {
                initialValue: ''
              }
            }
          ],
          analysis: [
            {
              type: 'diagram',
              persisted: {}
            }
          ]
        },

        bindings: {
          searchField: ({ initialValue }) => {
            return {
              labelWidget: 'Searchfox Search',
              awaitContent: null,
              contentFactory: (props, data) => {
                return (
                  <SearchFieldSheet {...props}
                    initialValue={ initialValue }
                    />
                );
              }
            }
          },

          searchResult: ({ searchText }, grokCtx) => {
            // Trigger a search, this returns a promise.
            const pendingResults = grokCtx.performSearch(searchText);

            return {
              labelWidget: <span>Search Results: <i>{searchText}</i></span>,
              // This will make the sheet display a loading indication until the
              // search completes.
              awaitContent: pendingResults,
              // Once the search completes, the contentFactory will be invoked
              // with the notebook sheet props plus the resolved content
              // promise.
              contentFactory: (props, searchResults) => {
                return (
                  <SearchResultsSheet {...props}
                    searchResults={ searchResults }
                    />
                );
              }
            };
          },

          diagram: (persisted, grokCtx) => {
            return {
              labelWidget: 'Diagram',
              awaitContent: null,
              contentFactory: (props) => {
                return <div></div>;
              }
            };
          }
        }
      }
    });

    this.state = {
      grokCtx
    };
  }

  render() {
    const explorationProps = {
      grokCtx: this.state.grokCtx
    };
    const artifactProps = {
      grokCtx: this.state.grokCtx
    }

    return (
      <ReflexContainer className="grokApp" orientation="vertical">
        <ReflexElement className="left-pane">
          <SessionNotebookContainer
            grokCtx={ this.state.grokCtx }
            trackName="exploration"
            />
        </ReflexElement>
        <ReflexSplitter />
        <ReflexElement className="right-pane"
          minSize="200" maxSize="800">
          <SessionNotebookContainer
            grokCtx={ this.state.grokCtx }
            trackName="analysis"
            />
        </ReflexElement>
      </ReflexContainer>
    );
  }
}

const contentNode = document.createElement('div');
contentNode.className = 'grok-ui-root';
document.body.appendChild(contentNode);
ReactDOM.render(<GrokApp />, contentNode);
