import { PolymerElement, html } from "../../../node_modules/@polymer/polymer/polymer-element.js";
import "../../../node_modules/@polymer/iron-icon/iron-icon.js";
import "../../../node_modules/@polymer/iron-icons/iron-icons.js";
import "../../../node_modules/@polymer/iron-icons/maps-icons.js";
import "../../../node_modules/@polymer/paper-tabs/paper-tabs.js";
import "../../../node_modules/@polymer/paper-tabs/paper-tab.js";
import "../../../node_modules/@polymer/iron-pages/iron-pages.js";
import './results-list-view.js';
import "../../../node_modules/@polymer/paper-button/paper-button.js";
import '../other/loading-overlay.js';
import '../../css/Common.js';
import { StringFormat } from '../other/string-format.js';
class SearchResults extends StringFormat(PolymerElement) {
  static get template() {
    return html`
            <style include="common">
                paper-tabs {
                    --paper-tabs-selection-bar-color: var(--main-light-blue);
                    --paper-tab-ink: var(--main-light-blue);
                    color: var(--main-dark-blue);
                }
                .opacitygrayscale {
                    opacity: 0.6;
                    filter: grayscale(100%);
                }
            </style>

            <loading-overlay id="loading" show="[[showSpinner]]"></loading-overlay>

            <div id="container" class="hide">
                <div>
                    Search Results: [[resultCount]]
                </div>
                <div id="searchViews">
                    <results-list-view id="list_view" name="list" result-count="{{resultCount}}" field-configurations="[[fieldConfigurations]]" client-settings="[[clientSettings]]" session-id="[[sessionId]]" show-spinner="{{showSpinner}}" on-search-failed="_searchFailed">
                        <div class="filter-button-container" slot="download-buttons">
                            <paper-button id="exportResultsButton" class="flat" on-click="_generateExportResultData">
                                <iron-icon icon="file-download"></iron-icon>
                                Download Data (JSON)
                            </paper-button>
                            <paper-button id="exportSummaryButton" class="flat" on-click="_generateExportSummaryData">
                                <iron-icon icon="file-download"></iron-icon>
                                Download Summary (CSV)
                            </paper-button>
                        </div>
                    </results-list-view>
                </div>
            </div>
        
            <iron-ajax id="downloadResultsAjax" url="[[rootPath]]../../api/Query/FileExport" method="POST" handle-as="blob" content-type="application/json" body="[[exportQuery]]" on-response="_exportResultsData" on-error="_exportErrorReponse"></iron-ajax>
            <iron-ajax id="downloadSummaryAjax" url="[[rootPath]]../../api/Query/FileExport" method="POST" handle-as="blob" content-type="application/json" body="[[exportQuery]]" on-response="_exportSummaryData" on-error="_exportErrorReponse"></iron-ajax>
        `;
  }
  static get properties() {
    return {
      sessionId: {
        type: Number
      },
      resultCount: {
        type: Number
      },
      resultView: {
        type: String,
        value: "list",
        observer: "_pageSelectedChanged"
      },
      _listNeedsUpdate: {
        type: Boolean,
        value: false
      },
      // _mapNeedsUpdate: {
      //     type: Boolean,
      //     value: false
      // },
      query: Object,
      exportQuery: Object,
      showSpinner: {
        type: Boolean,
        value: false,
        observer: "_spinnerVisibility",
        notify: true,
        reflectToAttribute: true
      },
      exportMaxSize: Number,
      clientSettings: Object,
      fieldConfigurations: Object
    };
  }

  /**
   * Based on the which result format tab is visible (list or map), submit the query and display the results in the correct format.
   */
  search() {
    this.$.container.classList.remove("hide");
    this.set('showSpinner', true);
    this._updateQueryWithOverrideColumns(this.query);
    this._formatSridRules(this.query);
    if (this.resultView == "list") {
      this.$.list_view.generateListResults(this.query);
      this._listNeedsUpdate = false;
      this._mapNeedsUpdate = true;
    }
    // else {
    //     this.$.map_view.generateMapResults(this.query);
    //     this._listNeedsUpdate = true;
    //     this._mapNeedsUpdate = false;
    // }
  }

  /**
   * Before submitting query, update any column lists to reflect only the override column in a rule if one is present.
   */
  _updateQueryWithOverrideColumns(query) {
    for (var i = 0; i < query.QueryGroups.length; i++) {
      var group = query.QueryGroups[i];
      for (var j = 0; j < group.QueryRules.length; j++) {
        var rule = group.QueryRules[j];
        if (rule.overrideColumn && rule.overrideColumn != "") {
          rule.Columns = [rule.overrideColumn];
        }
      }
    }
  }

  /**
   * Before submitting the query, any rules that search against SRID need to format the user input
   */
  _formatSridRules(query) {
    for (var i = 0; i < query.QueryGroups.length; i++) {
      var group = query.QueryGroups[i];
      let rule = group.QueryRules.find(rule => rule.Columns.indexOf("Recs.Srid") > -1 || rule.Columns.indexOf("Recs.SridCleaned") > -1);
      if (rule) {
        for (var j = 0; j < rule.Values.length; j++) {
          rule.Values[j] = this.formatSrid(rule.Values[j]);
        }
      }
    }
  }
  _spinnerVisibility() {
    if (!this.showSpinner) {
      this.$.searchViews.classList.remove("hide");
    } else {
      this.$.searchViews.classList.add("hide");
    }
  }
  _generateExportResultData() {
    this.$.exportResultsButton.disabled = true;
    this.$.exportResultsButton.classList.add("opacitygrayscale");
    if (this.resultCount > this.exportMaxSize) {
      var doExport = confirm("The result count is greater than " + this.exportMaxSize + ", the export will only contain the first " + this.exportMaxSize + " results.");
      if (!doExport) {
        this.$.exportResultsButton.classList.remove("opacitygrayscale");
        this.$.exportResultsButton.disabled = false;
        return;
      }
    }
    this._updateQueryWithOverrideColumns(this.query);
    this.query["ExportFormat"] = "data";
    this.query["SessionId"] = this.sessionId;
    let jsonString = JSON.stringify(this.query);
    this.set('exportQuery', JSON.parse(jsonString));
    this.set('exportQuery.ResultSetSize', 500);
    this.set('exportQuery.SortDescending', true);
    this.set('showSpinner', true);
    this.$.downloadResultsAjax.generateRequest();
  }
  _exportResultsData(e) {
    var contentDisposition = e.detail.xhr.getResponseHeader('Content-Disposition');
    var cdSplit = contentDisposition.split("=");
    var fileName = cdSplit[1];
    var blob = new Blob([e.detail.xhr.response]);
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    this.$.exportResultsButton.classList.remove("opacitygrayscale");
    this.$.exportResultsButton.disabled = false;
    this.set('showSpinner', false);
  }
  _generateExportSummaryData() {
    this.$.exportSummaryButton.disabled = true;
    this.$.exportSummaryButton.classList.add("opacitygrayscale");
    if (this.resultCount > this.exportMaxSize) {
      var doExport = confirm("The result count is greater than " + this.exportMaxSize + ", the export will only contain the first " + this.exportMaxSize + " results.");
      if (!doExport) {
        this.$.exportSummaryButton.classList.remove("opacitygrayscale");
        this.$.exportSummaryButton.disabled = false;
        return;
      }
    }
    this._updateQueryWithOverrideColumns(this.query);
    this.query["ExportFormat"] = "summary";
    this.query["SessionId"] = this.sessionId;
    let jsonString = JSON.stringify(this.query);
    this.set('exportQuery', JSON.parse(jsonString));
    this.set('exportQuery.ResultSetSize', 500);
    this.set('exportQuery.SortDescending', true);
    this.set('showSpinner', true);
    this.$.downloadSummaryAjax.generateRequest();
  }
  _exportSummaryData(e) {
    var contentDisposition = e.detail.xhr.getResponseHeader('Content-Disposition');
    var cdSplit = contentDisposition.split("=");
    var fileName = cdSplit[1];
    var blob = new Blob([e.detail.xhr.response]);
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    this.$.exportSummaryButton.classList.remove("opacitygrayscale");
    this.$.exportSummaryButton.disabled = false;
    this.set('showSpinner', false);
  }
  _exportErrorResponse(e) {
    this.set('showSpinner', false);
  }
  _filterClicked(e) {
    this.dispatchEvent(new CustomEvent('filter-results-clicked'));
  }
  _searchFailed(e) {
    this.dispatchEvent(new CustomEvent('search-failed'));
    let errorMessage = "Search failed";
    if (e.detail.message.Error) errorMessage = e.detail.message.Error;else if (e.detail.message.ExceptionMessage) errorMessage = e.detail.message.ExceptionMessage;else if (e.detail.message.Message) errorMessage = e.detail.message.Message;else if (e.detail.message) errorMessage = e.detail.message;
    alert(errorMessage);
  }
  _pageSelectedChanged(page) {
    if (page == "list" && this._listNeedsUpdate) {
      this._updateQueryWithOverrideColumns(this.query);
      this.set('showSpinner', true);
      this.$.list_view.generateListResults(this.query);
      this._listNeedsUpdate = false;
    }
    // } else if (page == "map") {
    //     this.$.map_view.resizeMap();
    //     if (this._mapNeedsUpdate) {
    //         this._updateQueryWithOverrideColumns(this.query);
    //         this.set('showSpinner', true);
    //         this.$.map_view.generateMapResults(this.query);
    //         this._mapNeedsUpdate = false;
    //     }
    // }
  }

  _clearForm() {
    this.$.container.classList.add("hide");
    //this.$.list_view.clearListView();
    //this.$.map_view._clearMapView();
  }
}

customElements.define('search-results', SearchResults);