import { PolymerElement, html } from "../../../node_modules/@polymer/polymer/polymer-element.js";
import "../../../node_modules/@vaadin/vaadin-grid/theme/material/vaadin-grid.js";
import "../../../node_modules/@polymer/iron-icon/iron-icon.js";
import "../../../node_modules/@polymer/iron-icons/iron-icons.js";
import "../../../node_modules/@polymer/iron-ajax/iron-ajax.js";
import "../../../node_modules/@polymer/paper-dropdown-menu/paper-dropdown-menu.js";
import "../../../node_modules/@polymer/paper-item/paper-item.js";
import "../../../node_modules/@polymer/paper-listbox/paper-listbox.js";
import "../../../node_modules/@polymer/iron-pages/iron-pages.js";
import './results-table-cases.js';
import './results-table-sr.js';
import '../../css/Common.js';
class ResultsListView extends PolymerElement {
  static get template() {
    return html`
            <style include="common">
                .pager {
                    display: flex;
                    align-items: center;
                }
                .pager paper-dropdown-menu {
                    width: 75px;
                }
                .pager paper-listbox {
                    width: 75px;
                }
                .pager a {
                    color: var(--main-primary-blue, blue);
                    text-decoration: underline;
                    padding-left: 5px;
                    cursor: pointer;
                }
                .pager a.selected-page {
                    color: var(--main-dark-blue, black);
                    font-weight: bold;
                    cursor:default;
                    text-decoration: none;
                }

                .footer-container {
                    display: flex;
                    justify-content: space-between;
                    padding: 15px 0;
                }
            </style>
            
            <iron-pages selected="[[listSearchQuery.TargetCollection]]" attr-for-selected="name">
                <results-table-cases name="cases" is-sort-initialized="{{isSortInitialized}}" sort-column="{{listSearchQuery.SortColumn}}" sort-descending="{{listSearchQuery.SortDescending}}" columns="[[results.Columns]]" results="[[results.Results]]" field-configurations="[[fieldConfigurations]]" client-settings="[[clientSettings]]"></results-table-cases>
                <results-table-sr name="safetyrecs" is-sort-initialized="{{isSortInitialized}}" sort-column="{{listSearchQuery.SortColumn}}" sort-descending="{{listSearchQuery.SortDescending}}" columns="[[results.Columns]]" results="[[results.Results]]" client-settings="[[clientSettings]]"></results-table-sr>
            </iron-pages>
            <div class="footer-container">
                <div class="pager">
                    <span>Show&nbsp;</span>
                    <paper-dropdown-menu id="open_cases_result_set_length" no-label-float on-value-changed="_resultSetLengthChanged" vertical-align="bottom">
                        <!--vertical-align="bottom" horizontal-align="left"-->
                        <paper-listbox slot="dropdown-content" class="dropdown-content" attr-for-selected="value" selected="50">
                            <paper-item value="10">10</paper-item>
                            <paper-item value="15">15</paper-item>
                            <paper-item value="25">25</paper-item>
                            <paper-item value="50">50</paper-item>
                            <paper-item value="75">75</paper-item>
                            <paper-item value="100">100</paper-item>
                        </paper-listbox>
                    </paper-dropdown-menu>
                    <span>&nbsp;results per page&nbsp;&nbsp;</span>
                    <div>
                        <iron-pages selected="0" id="groups">
                            <template is="dom-repeat" items="[[pageGroups]]">
                                <div>
                                    <a class\$="[[_showPreviousEllipsis(pageGroups, index)]]" on-click="_previousPageGroup">...</a>
                                    <template is="dom-repeat" items="[[item.pages]]">
                                        <a class\$="[[_selectedPageClass(item.Offset, listSearchQuery.ResultSetOffset)]]" on-click="_changePage">[[item.DisplayNumber]]</a>
                                    </template>
                                    <a class\$="[[_showNextEllipsis(pageGroups, index)]]" on-click="_nextPageGroup">...</a>
                                </div>
                            </template>
                        </iron-pages>
                    </div>
                </div>
                <div>
                    <slot name="download-buttons"></slot>
                </div>
            </div>
            
            
            <iron-ajax id="search" url="[[rootPath]]../../api/Query/Main" method="POST" content-type="application/json" body="[[listSearchQuery]]" on-response="_setTotalListResultCount" on-error="_searchError"></iron-ajax>
        `;
  }
  static get properties() {
    return {
      sessionId: Number,
      results: {
        type: Object,
        value: function () {
          return {
            "Columns": [],
            "MaxResultCountReached": false,
            "ResultListCount": 0,
            "Results": []
          };
        }
      },
      clientSettings: Object,
      listSearchQuery: {
        type: Object,
        value: function () {
          return {
            "ResultSetSize": 50,
            "ResultSetOffset": 0,
            "QueryGroups": [],
            "AndOr": "and",
            "SortColumn": null,
            "SortDescending": true,
            "TargetCollection": "cases"
          };
        },
        notify: true
      },
      isSortInitialized: {
        type: Boolean,
        value: false
      },
      _oldSortValues: {
        type: Object,
        value: function () {
          return {
            "SortColumn": null,
            "SortDescending": true
          };
        }
      },
      resultCount: {
        type: Number,
        notify: true
      },
      pageGroups: Array,
      showSpinner: {
        type: Boolean,
        notify: true,
        reflectToAttribute: true
      },
      pageChanged: {
        type: Boolean,
        value: false,
        notify: true
      },
      fieldConfigurations: Object
    };
  }
  static get observers() {
    return ["_sortColumnChanged(listSearchQuery.SortColumn, listSearchQuery.SortDescending)", "_targetCollectionChanged(listSearchQuery.TargetCollection)"];
  }
  _targetCollectionChanged(targetCollection) {
    this.set('listSearchQuery.SortColumn', null);
    this.set('listSearchQuery.SortDescending', true);
    this.set('isSortInitialized', false);
  }
  _sortColumnChanged(sortColumn, sortDescending) {
    if (this.isSortInitialized && (this._oldSortValues.SortColumn != sortColumn || this._oldSortValues.SortDescending != sortDescending)) {
      this.set('_oldSortValues.SortColumn', sortColumn);
      this.set('_oldSortValues.SortDescending', sortDescending);
      this.$.search.generateRequest();
    }
  }
  _extractResultValue(fields, fieldName) {
    if (fields) {
      var field = fields.find(f => {
        return f.FieldName == fieldName;
      });
      if (field && field.Values) {
        return field.Values.join(", ");
      }
    }
  }

  /* BEGIN PAGER FUNCTIONS */
  _selectedPageClass(pageOffset, resultSetOffset) {
    if (pageOffset === resultSetOffset) return "selected-page";else return "";
  }
  _previousPageGroup(e) {
    this.$.groups.selectPrevious();
  }
  _nextPageGroup(e) {
    this.$.groups.selectNext();
  }
  _showPreviousEllipsis(pageGroups, index) {
    if (index > 0 && pageGroups.length > 1) return "";else return "hide";
  }
  _showNextEllipsis(pageGroups, index) {
    if (pageGroups.length > 1 && index < pageGroups.length - 1) return "";else return "hide";
  }
  _resultSetLengthChanged(e) {
    this.$.groups.selected = 0;
    if (this.results && this.results.ResultListCount > 0 && e.detail.value) {
      //Only do this if there's been a search already, to avoid running on page load
      this.listSearchQuery.ResultSetOffset = 0; //Not observable
      this.listSearchQuery.ResultSetSize = e.detail.value;
      this.$.search.generateRequest();
    }
  }
  _updateResultPaging(resultCount, pageLength) {
    let pageGroups = [{
      "pages": []
    }];
    let displayNumber = 1;
    let offset = 0;
    pageLength = parseInt(pageLength); //pageLength getting passed in as a string from dropdown
    while (offset < resultCount) {
      let page = {
        "DisplayNumber": displayNumber,
        "Offset": offset
      };
      pageGroups[pageGroups.length - 1].pages.push(page);
      if (pageGroups[pageGroups.length - 1].pages.length >= 50) {
        pageGroups.push({
          "pages": []
        });
      }
      displayNumber = displayNumber + 1;
      offset = offset + pageLength;
    }
    this.pageGroups = pageGroups;
    if (!this.pageChanged) {
      this.$.groups.selected = 0;
    }
    this.set('pageChanged', false);
  }
  _changePage(e) {
    this.set('showSpinner', true);
    this.set('listSearchQuery.ResultSetOffset', e.model.item.Offset);
    this.set('pageChanged', true);
    this.$.search.generateRequest();
  }
  /* END PAGER FUNCTIONS */

  //Set the query in the object that's sent to the server, and run the query
  generateListResults(query) {
    if (query) {
      this.listSearchQuery.ResultSetOffset = 0; //Not observable
      this.set('listSearchQuery.QueryGroups', query.QueryGroups);
      this.set('listSearchQuery.AndOr', query.AndOr);
      this.set('listSearchQuery.SessionId', this.sessionId);
      this.set('listSearchQuery.TargetCollection', query.TargetCollection);
      this.$.search.generateRequest();
    } else
      //TODO Do something with our error handling!
      alert("null query!");
  }

  //Sets the number of cases returned by the query to resultCount
  _setTotalListResultCount(e) {
    this.set('results', e.detail.response);
    //let resultCountText = e.detail.response.MaxResultCountReached == true ? e.detail.response.ResultListCount + "+" : e.detail.response.ResultListCount;
    let resultCountText = e.detail.response.ResultListCount;
    this.set('resultCount', resultCountText);
    this._updateResultPaging(e.detail.response.ResultListCount, this.listSearchQuery.ResultSetSize);
    this.set('showSpinner', false);
  }
  _searchError(e) {
    this.set('showSpinner', false);
    this.dispatchEvent(new CustomEvent('search-failed', {
      detail: {
        message: e.detail.request.response
      }
    }));
  }
}
customElements.define('results-list-view', ResultsListView);