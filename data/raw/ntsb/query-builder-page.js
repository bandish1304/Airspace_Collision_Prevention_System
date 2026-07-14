import { PolymerElement, html } from "../../../node_modules/@polymer/polymer/polymer-element.js";
import "../../../node_modules/@polymer/iron-ajax/iron-ajax.js";
import "../../../node_modules/@polymer/paper-button/paper-button.js";
import "../../../node_modules/@polymer/paper-icon-button/paper-icon-button.js";
import "../../../node_modules/@polymer/iron-icon/iron-icon.js";
import "../../../node_modules/@polymer/iron-icons/iron-icons.js";
import "../../../node_modules/@polymer/paper-radio-group/paper-radio-group.js";
import '../query-builder/query-builder-group.js';
import '../search-results/search-results.js';
import '../other/save-query-modal.js';
import '../../css/Common.js';
import { FieldConfigurationsMixin } from '../other/field-configurations-mixin.js';
class QueryBuilderPage extends FieldConfigurationsMixin(PolymerElement) {
  static get template() {
    return html`
            <style include="common">
                .button-container {
                    text-align: right;
                    padding: 15px;
                }

                .radio_container {
                    display: flex;
                    padding: 15px 0;
                }
            </style>
            <div class="radio_container">
                <div>Search for: </div>
                <paper-radio-group id="target_collection" selected="{{query.TargetCollection}}" on-change="_targetCollectionRadioChanged">
                    <paper-radio-button name="cases">Investigations</paper-radio-button>
                    <paper-radio-button name="safetyrecs">Recommendations</paper-radio-button>
                </paper-radio-group>
            </div>
            <div class$="[[_showQueryBuilder(query.TargetCollection)]]">
                <div class$="[[_showGroupAndOr(query.QueryGroups)]]">
                    Find results that match
                    <vaadin-combo-box id="and_or"
                                    no-label-float
                                    value="{{query.AndOr}}"
                                    style="width: 100px; display: inline-block;">
                        <paper-icon-button class="hide" slot="clear-button"></paper-icon-button>
                    </vaadin-combo-box>
                    of the following groups of rules:
                </div>
                <template id="query_builder_template" is="dom-repeat" items="{{query.QueryGroups}}">
                    <query-builder-group index="[[_groupDisplayIndex(index)]]"
                                        expanded="[[_expandQueryGroup(index, query.QueryGroups)]]"
                                        query="{{item}}"
                                        in-last-search="{{item.inLastSearch}}"
                                        edited-since-last-search="{{item.editedSinceLastSearch}}"
                                        options="[[options]]"
                                        field-types="[[fieldTypes]]"
                                        on-query-submit="_searchWithValidate"
                                        lookup-column="{{lookupColumn}}"
                                        lookup-data="[[lookupData]]"
                                        unit-options="[[unitOptions]]"
                                        is-loaded-query="[[isLoadedQuery]]"
                                        on-group-changed="_groupChanged">
                        <!--Remove group buttons-->
                        <span slot="header-container">
                            <paper-button class$="[[_showRemoveGroupButton(query.QueryGroups)]]" on-click="_removeQueryGroup">
                                <iron-icon icon="clear"></iron-icon>
                                Delete Group
                            </paper-button>
                        </span>
                        <span slot="edit-container">
                            <paper-button style="float: right" class$="[[_showRemoveGroupButton(query.QueryGroups)]]" on-click="_removeQueryGroup">
                                <iron-icon icon="clear"></iron-icon>
                                Delete Group
                            </paper-button>
                        </span>
                    </query-builder-group>
                </template>
                <div class="button-container">
                    <paper-button class="flat" on-click="_resetForm">
                        <iron-icon icon="refresh"></iron-icon>
                        Reset
                    </paper-button>
                    <paper-button class="flat" on-click="_addNewQueryGroup">
                        <iron-icon icon="add-circle"></iron-icon>
                        Add Group
                    </paper-button>
                    <paper-button id="save_query_button" hidden$="[[_isFieldDisabled(fieldConfigurations.SaveQuery)]]" class="flat hide" on-click="_saveQuery">
                        <iron-icon icon="save"></iron-icon>
                        Save Search
                    </paper-button>
                    <paper-button raised class="primary" on-click="_searchWithValidate" disabled="[[searchDisabled]]">
                        <iron-icon icon="search"></iron-icon>&nbsp;
                        Search
                    </paper-button>
                </div>
            </div>

            <save-query-modal id="save_query_modal" query="[[mostRecentlySearchedQueryString]]" context="[[_getQuerySaveContext()]]" update-Saved-Queries="{{updateSavedQueries}}"></save-query-modal>

            <search-results id="results" allow-filter query="[[mostRecentlySearchedQuery]]" client-settings="[[clientSettings]]" field-configurations="[[fieldConfigurations]]" session-Id="[[sessionId]]" on-filter-results-clicked="_filterResults" on-search-failed="_searchFailed" export-max-size="[[exportMaxSize]]"></search-results>

            <iron-ajax auto url="[[rootPath]]../../api/Lookup/QueryBuilderFieldCategory/List" last-response="{{options}}"></iron-ajax>
            <iron-ajax auto url="[[rootPath]]../../api/Lookup/QueryBuilderFieldTypeConfig/List" last-response="{{fieldTypes}}"></iron-ajax>
            <iron-ajax id="dropDownDataLookup" url="[[rootPath]]../../api/Lookup/ValueOption/Search/Columns" method="POST" content-type="application/json" on-response="_setLookupDataAjaxResponse" body="[[lookupColumn]]"></iron-ajax>
            <iron-ajax id="get_saved_query_ajax" url="[[rootPath]]../../api/QueryPersistence/TargetUser/GetSavedQuery/[[userId]]/[[queryNumber]]" method="GET" last-response="{{savedQuery}}" on-response="_savedQueryAjaxResponse"></iron-ajax>
            <iron-ajax id="get_published_query_ajax" url="[[rootPath]]../../api/QueryPersistence/GetPublishedQuery/[[queryNumber]]" method="GET" last-response="{{publishedQuery}}" on-response="_publishedQueryAjaxResponse"></iron-ajax>
            <iron-ajax id="get_month_year_query_ajax" url="[[rootPath]]../../api/QueryPersistence/GetMonthYearQuery/[[queryParams.month]]/[[queryParams.year]]" method="GET" last-response="{{monthYearQuery}}" on-response="_monthYearQueryAjaxResponse"></iron-ajax>
        `;
  }
  static get properties() {
    return {
      sessionId: {
        type: Number
      },
      updateSavedQueries: {
        type: Boolean,
        notify: true
      },
      _searchSavedQueryFlag: {
        type: Boolean,
        value: false
      },
      _searchPublishedQueryFlag: {
        type: Boolean,
        value: false
      },
      _searchMonthYearQueryFlag: {
        type: Boolean,
        value: false
      },
      isLoadedQuery: {
        type: Boolean,
        value: false,
        notify: true
      },
      options: Array,
      fieldTypes: Array,
      query: {
        type: Object
      },
      mostRecentlySearchedQuery: Object,
      mostRecentlySearchQueryString: String,
      lookupColumn: {
        type: Array,
        notify: true,
        value: function () {
          return [];
        }
      },
      lookupData: {
        type: Array,
        notify: true,
        value: function () {
          return {
            "TableColumns": []
          };
        }
      },
      lookupRequest: String,
      searchDisabled: {
        type: Boolean,
        value: false
      },
      clientSettings: Object,
      fieldConfigurations: Object,
      queryParams: Object
    };
  }
  static get observers() {
    return ["_getLookupData(lookupColumn.*)", "_savedQueryDataLoaded(_searchSavedQueryFlag, options, fieldTypes, savedQuery)", "_publishedQueryDataLoaded(_searchPublishedQueryFlag, options, fieldTypes, publishedQuery)", "_monthYearQueryDataLoaded(_searchMonthYearQueryFlag, options, fieldTypes, monthYearQuery)", "_routeChangedLoadSavedOrPublishedQuery(route.path)", "_queryParamsChanged(queryParams.month, queryParams.year)"];
  }
  ready() {
    super.ready();
    this.$.and_or.items = [{
      label: 'ALL',
      value: 'and'
    }, {
      label: 'ANY',
      value: 'or'
    }];
    this.$.and_or.value = 'and';

    // search the saved query after the dom bindings are completed
    // this event is fired once after dom-repeat finishes all processing for all elements
    var globalScope = this;
    this.$.query_builder_template.addEventListener("dom-change", function (e) {
      if (globalScope._searchSavedQueryFlag) {
        globalScope.set('isLoadedQuery', true);
        globalScope.set('_searchSavedQueryFlag', false);
        globalScope._searchWithValidate();
      } else if (globalScope._searchPublishedQueryFlag) {
        globalScope.set('isLoadedQuery', true);
        globalScope.set('_searchPublishedQueryFlag', false);
        globalScope._searchWithValidate();
      } else if (globalScope._searchMonthYearQueryFlag) {
        globalScope.set('isLoadedQuery', true);
        globalScope.set('_searchMonthYearQueryFlag', false);
        globalScope._searchWithValidate();
      }
    });

    // not a saved query, set default
    if (this.route.path != "/route" && this.route.path != "/route/" && !(this.queryParams.month && this.queryParams.year)) this._resetForm();
  }

  //Only show query builder if target collection is set
  _showQueryBuilder(targetCollection) {
    if (!targetCollection || targetCollection == "") return "hide";
  }
  _savedQueryAjaxResponse(e) {
    this.set('_searchSavedQueryFlag', true);
  }
  _publishedQueryAjaxResponse(e) {
    this.set('_searchPublishedQueryFlag', true);
  }
  _monthYearQueryAjaxResponse(e) {
    this.set('_searchMonthYearQueryFlag', true);
  }
  _routeChangedLoadSavedOrPublishedQuery(routePath) {
    // attempting to access a saved/published query via route
    if (this.route.path == "/route" || this.route.path == "/route/") {
      var queryParams = this.route.__queryParams;
      if (queryParams.t.toLowerCase() == "published") {
        //published query
        this.set('queryNumber', queryParams.n);
        if (this.queryNumber) {
          this.shadowRoot.querySelector("#get_published_query_ajax").generateRequest();
        }
      } else if (queryParams.t.toLowerCase() == "saved") {
        //saved query
        this.set('userId', queryParams.u);
        this.set('queryNumber', queryParams.n);
        if (this.userId && this.queryNumber) {
          this.shadowRoot.querySelector("#get_saved_query_ajax").generateRequest();
        }
      }
    }
  }
  _savedQueryDataLoaded(searchSavedQueryFlag, options, fieldTypes, savedQuery) {
    this._queryDataLoaded(searchSavedQueryFlag, options, fieldTypes, savedQuery);
  }
  _publishedQueryDataLoaded(searchPublishedQueryFlag, options, fieldTypes, publishedQuery) {
    this._queryDataLoaded(searchPublishedQueryFlag, options, fieldTypes, publishedQuery);
  }
  _monthYearQueryDataLoaded(searchMonthYearQueryFlag, options, fieldTypes, monthYearQuery) {
    this._queryDataLoaded(searchMonthYearQueryFlag, options, fieldTypes, monthYearQuery);
  }
  _queryDataLoaded(searchQueryFlag, options, fieldTypes, query) {
    if (searchQueryFlag && options && fieldTypes && query) {
      this._setLookupDataArray(query.LookupData);
      let queryObj = JSON.parse(query.QueryText);
      this._setQueryFromSavedOrPublished(queryObj);
    }
  }
  _setQueryFromSavedOrPublished(queryObj) {
    // the inLastSearch and editedSinceLastSearch are UI only properties, we need to copy over the data in order to get these properties into our object
    let newGroups = [];
    for (var i = 0; i < queryObj.QueryGroups.length; i++) {
      let oldGroup = queryObj.QueryGroups[i];
      let newGroup = {
        "QueryRules": oldGroup.QueryRules,
        "AndOr": oldGroup.AndOr.toLowerCase(),
        "inLastSearch": false,
        "editedSinceLastSearch": false
      };
      newGroups.push(newGroup);
    }
    queryObj.QueryGroups = newGroups;
    this.set('query', queryObj);
  }

  //Don't show the header/top level line with the and/or dropdown unless there's more than one query group
  _showGroupAndOr(queryGroups) {
    if (queryGroups.length > 1) return "";else return "hide";
  }

  //By default, only the last query group in the list should start out as expanded for editing.
  _expandQueryGroup(index, queryGroups) {
    let length = queryGroups.length;
    if (length > 1 && (this._searchSavedQueryFlag || this._searchPublishedQueryFlag)) {
      return false;
    } else {
      if (index >= length - 1) return true;else return false;
    }
  }

  //To filter results, we use the same query the user submitted last, and add a query group to it to filter it down further
  _filterResults(e) {
    this.set('query', JSON.parse(JSON.stringify(this.mostRecentlySearchedQuery)));
    this._addNewQueryGroup();
  }

  //Add a new query group to the query, with a blank rule so something shows up in the page
  _addNewQueryGroup() {
    let newGroup = {
      "QueryRules": [{
        "RuleType": "Simple",
        "Values": [],
        "Columns": [],
        "Operator": ""
      }],
      "AndOr": "and",
      "inLastSearch": false,
      "editedSinceLastSearch": false
    };
    this.push('query.QueryGroups', newGroup);
    this.notifyPath('query.QueryGroups'); //Refresh expanded/not expanded groups
  }

  //Remove query group from the query. Need to notify path to refresh bindings.
  _removeQueryGroup(e) {
    this.splice('query.QueryGroups', e.model.index, 1);
    this.notifyPath('query.QueryGroups');
    this._setSearchDisabled(false);
  }

  //Only show the remove group button if there's more than one group
  _showRemoveGroupButton(groups) {
    if (groups.length <= 1) return "hide";else return "remove";
  }
  _getLookupData() {
    this.$.dropDownDataLookup.generateRequest();
  }
  _setLookupDataAjaxResponse(e) {
    if (e.detail.response.length != 0) {
      var lookupDataValues = e.detail.response[0];
      this._setLookupData(lookupDataValues);
    }
  }
  _setLookupData(lookupDataValues) {
    if (lookupDataValues && lookupDataValues.Options.length != 0) {
      this.push('lookupData.TableColumns', lookupDataValues);
    }
  }

  // LookupData setter helper method
  // lookupDataValuesArray[] contains an array of lookup data value arrays
  _setLookupDataArray(lookupDataValuesArray) {
    if (lookupDataValuesArray) {
      for (var i = 0; i < lookupDataValuesArray.length; i++) {
        this._setLookupData(lookupDataValuesArray[i]);
      }
    }
  }
  _setSearchDisabled(disabled) {
    this.set('searchDisabled', disabled);
  }
  _groupChanged(e) {
    this._setSearchDisabled(false);
  }
  _searchFailed(e) {
    this._setSearchDisabled(false);
  }

  //Copy query to mostRecentlySearchedQuery, and pass it down to search-results to perform the actual search
  _searchWithValidate() {
    if (this._validate()) {
      this.set('mostRecentlySearchedQueryString', JSON.stringify(this.query));
      this.set('mostRecentlySearchedQuery', JSON.parse(this.mostRecentlySearchedQueryString));
      this.$.results.search();
      this.$.save_query_button.classList.remove("hide");
      this._setSearchDisabled(true);
    }
  }
  _saveQuery() {
    if (this._validate()) this.$.save_query_modal.open();
  }
  _validate() {
    var validated = true;
    var queryBuilderGroups = this.shadowRoot.querySelectorAll("query-builder-group");
    for (var i = 0; i < queryBuilderGroups.length; i++) {
      if (!queryBuilderGroups[i].validate()) validated = false;
    }
    if (this.query.TargetCollection == null) validated = false;
    return validated;
  }
  _groupDisplayIndex(index) {
    return index + 1;
  }
  _getQuerySaveContext() {
    return this.route.prefix;
  }
  _queryParamsChanged(month, year) {
    //Check if a value has been submitted for both month and year
    if (!month && !year) return;
    month = Number(month);
    year = Number(year);

    //If just one or the other submitted, input is invalid. If month and year are not both ints, input is invalid. Month must be 1-12.
    if (!month && year || month && !year || !Number.isInteger(month) || !Number.isInteger(year) || month < 1 || month > 12) {
      alert('Invalid month and year. Query string format should be: "?month=[MONTH (number)]&year=[YEAR]"');
      return;
    }

    //Get the query template and use it to fill in the page
    this.$.get_month_year_query_ajax.generateRequest();
  }
  _resetForm() {
    let defaultValue = {
      "QueryGroups": [{
        "QueryRules": [{
          "RuleType": "Simple",
          "Values": [],
          "Columns": [],
          "Operator": "",
          "overrideColumn": ""
        }],
        "AndOr": "and",
        "inLastSearch": false,
        "editedSinceLastSearch": false
      }],
      "AndOr": "and",
      "TargetCollection": "cases"
    };
    this.set('query', defaultValue);
    this.$.results._clearForm();
  }
  _targetCollectionRadioChanged(e) {
    this._setSearchDisabled(false);
  }
}
customElements.define('query-builder-page', QueryBuilderPage);