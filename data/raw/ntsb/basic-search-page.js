import { PolymerElement, html } from "../../../node_modules/@polymer/polymer/polymer-element.js";
import "../../../node_modules/@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box.js";
import "../../../node_modules/@polymer/paper-input/paper-input.js";
import "../../../node_modules/@polymer/iron-ajax/iron-ajax.js";
import "../../../node_modules/@polymer/paper-button/paper-button.js";
import "../../../node_modules/@polymer/iron-icon/iron-icon.js";
import "../../../node_modules/@polymer/iron-icons/iron-icons.js";
import "../../../node_modules/@polymer/paper-radio-group/paper-radio-group.js";
import '../search-results/search-results.js';
import '../form-fields/date-input.js';
import '../../css/Common.js';
class BasicSearchPage extends PolymerElement {
  static get template() {
    return html`
            <style include="common">
                .flex-line {
                    display: flex;
                    flex-wrap: nowrap;
                }
                    .flex-line span {
                        align-self: flex-end;
                        padding: 10px;
                    }
                    .flex-line date-input {
                        width: 100%;
                    }

                .search-icon {
                    color: rgb(115, 115, 115);
                    padding: 0 5px 0 5px;
                }

                .button-container {
                    text-align: right;
                    padding-top: 15px;
                }

                paper-input, vaadin-combo-box {
                    width: 100%;
                }

                .section-container {
                    display: grid;
                    grid-template-columns: 3fr 2fr;
                    gap: 15px 15px;
                    justify-items: stretch;
                    align-items: stretch;
                    justify-content: stretch;
                    margin-top: 15px;
                }
                    .section-container > div, .input-container {
                        border: 1px solid #e0e0e0;
                        padding: 10px;
                        background-color: white;
                    }
                
                .section-heading {
                    padding-bottom: 10px;
                }

                /* .info {
                    font-size: 14px;
                    font-weight: bold;
                    line-height: 24px;
                    margin-top: -8px;
                    padding-bottom: 8px;
                } */

                .input-container, .section-container > div {
                    text-align: left;
                }

                p  {
                    font-size: 16px;
                    line-height: 24px;
                    color: var(--default-black);
                }

                ul {
                    font-size: 16px;
                    line-height: 30px;
                    color: var(--default-black);
                    list-style-position: inside;
                    padding: 0 15px;
                }

                .input-container {
                    display: flex;
                }

                @media screen and (max-width: 935px) {
                    .section-container {
                        grid-template-columns: 1fr;
                    }
                }
            </style>

            <div class="container">
                
                <div class="input-container">
                    <div>Search for: </div>
                    <paper-radio-group id="target_collection" selected="{{query.TargetCollection}}">
                        <paper-radio-button name="cases">Investigations</paper-radio-button>
                        <paper-radio-button name="safetyrecs">Recommendations</paper-radio-button>
                    </paper-radio-group>
                </div>

                <div class$="[[_hideBasicSearch(query.TargetCollection, 'section-container')]]">
                    <div>
                        <div class="section-heading h2">Common Investigation Fields</div>
                        <div class="h6">
                            Aviation data available from 1962 to present <br> Surface mode data available from 2010 to present <br>                       
                         </div>
                        <div class="flex-line">
                            <date-input label="Event date: from" on-keydown="_submitQueryKeystroke" value="{{eventDateFrom}}"></date-input>
                            <span style="font-weight:bold" >to</span>
                            <date-input label="Event date: to" on-keydown="_submitQueryKeystroke" value="{{eventDateTo}}"></date-input>
                            
                        </div>
                       

                        <div class="flex-line">
                        <paper-input id="City" label="City" on-keydown="_submitQueryKeystroke" value=""></paper-input>
                         <span>&nbsp</span> 
                         <vaadin-combo-box id="Mode" label="Mode" on-keydown="_submitQueryKeystroke" item-label-path="DisplayText" item-value-path="Value"></vaadin-combo-box>
                       
                          </div>
                        
                         <div class="flex-line">
                          <vaadin-combo-box id="State" label="State" on-keydown="_submitQueryKeystroke" item-label-path="DisplayText" item-value-path="Value"></vaadin-combo-box>
                       
                        <span>&nbsp</span>  
                        <paper-input id="NTSBNumber" label="NTSB#" on-keydown="_submitQueryKeystroke" value=""></paper-input>
                      </div>
                        <div class="flex-line">
                          <vaadin-combo-box id="Country" label="Country" on-keydown="_submitQueryKeystroke" item-label-path="DisplayText" item-value-path="Value"></vaadin-combo-box>
                         <span>&nbsp</span>  
                        <vaadin-combo-box id="HighestInjury" label="Highest injury level" on-keydown="_submitQueryKeystroke" item-label-path="DisplayText" item-value-path="Value"></vaadin-combo-box>
 
                        </div>

                          <div class="flex-line">
                       <date-input label="Publish date: from" on-keydown="_submitQueryKeystroke" value="{{publishDateFrom}}"></date-input>
                            <span style="font-weight:bold">to</span>
                            <date-input label="Publish date: to" on-keydown="_submitQueryKeystroke" value="{{publishDateTo}}"></date-input>
                        </div>
                        
                          </div>
                   
                   <div>
                        <div class="section-heading h2">Safety Recommendation Fields</div>
                        <div class="h6">
                            All data available                            
                        </div>
                        <div class="h7">
                           Note: The surface mode investigation data limitations apply to recommendation searches that use the investigation search fields.
                        </div>
                        <paper-input id="RecNum" label="Safety recommendation number" on-keydown="_submitQueryKeystroke" value=""></paper-input>
                        <paper-input id="RecsSubject" label="Recommendation text" on-keydown="_submitQueryKeystroke" value=""></paper-input>
                        <paper-input id="AddresseeName" label="Addressee name" on-keydown="_submitQueryKeystroke" value=""></paper-input>
                    </div>
                     
                </div>
            
                <div class$="[[_hideBasicSearch(query.TargetCollection, 'button-container')]]">
                    <a style="text-decoration: none;" href$="[[rootPath]]../../query-builder">
                        <paper-button class="flat">
                            <iron-icon icon="zoom-in"></iron-icon>
                            Go to Custom Search
                        </paper-button>
                    </a>
                    <paper-button class="flat" on-click="_resetForm">
                        <iron-icon icon="refresh"></iron-icon>
                        Reset
                    </paper-button>
                    <paper-button raised class="primary" on-click="_search">
                        <iron-icon icon="search"></iron-icon>&nbsp;
                        Search
                    </paper-button>
                </div>
            </div>

            <search-results id="results" query="[[query]]" field-configurations="[[fieldConfigurations]]" session-id="[[sessionId]]" export-max-size="[[exportMaxSize]]" client-settings="[[clientSettings]]"></search-results>

            <iron-ajax auto url="[[rootPath]]../../api/Query/BasicSearchTemplate" on-response="_basicSearchTemplateResponse"></iron-ajax>
            <iron-ajax id="DropDownDataRequest" auto
                       url="[[rootPath]]../../api/Lookup/ValueOption/Search/Columns"
                       method="POST"
                       content-type="application/json"
                       last-response="{{lookup}}"
                       body="[[lookupDataRequest]]"
                       on-response="_setLookupDataAjaxResponse"></iron-ajax>
        `;
  }
  static get properties() {
    return {
      sessionId: Number,
      updateSavedQueries: {
        type: Boolean,
        value: false,
        notify: true
      },
      query: Object,
      eventDateFrom: String,
      eventDateTo: String,
      publishDateFrom: String,
      publishDateTo: String,
      lookup: Object,
      lookupDataRequest: {
        type: Object,
        value: function () {
          return ["Event.State", "Event.Country", "Event.HighestInjury", "Event.Mode", "Aircraft.AircraftCategory", "AviationOperation.RegulationFlightConductedUnder"];
        }
      },
      clientSettings: Object,
      fieldConfigurations: Object
    };
  }
  _basicSearchTemplateResponse(e) {
    this.set('query', e.detail.response);
    this.set('query.TargetCollection', 'cases');
  }
  _submitQueryKeystroke(e) {
    if (e.keyCode === 13) {
      // enter key
      this._search();
    }
  }
  _search() {
    if (this.query.TargetCollection == null) return;
    var queryEmpty = true;

    // Set query values to field values
    this._copyDatePairToQuery(this.eventDateFrom, this.eventDateTo, "EventDate");
    this._copyDatePairToQuery(this.publishDateFrom, this.publishDateTo, "OriginalPublishedDate");
    for (var i = 0; i < this.query.QueryGroups.length; i++) {
      for (var queryIdx in this.query.QueryGroups[i].QueryRules) {
        var queryField = this.query.QueryGroups[i].QueryRules[queryIdx];
        var polymerField = this.shadowRoot.querySelector("#" + queryField.FieldName);
        if (polymerField) {
          if (typeof polymerField.value != "undefined" && polymerField.value != "") queryField.Values[0] = polymerField.value;else queryField.Values = [];
        }

        // The dates get set in copyDatePairToQuery
        // The queryField will pull the EventDate and ApprovalDate so we can see if the values are present
        // They just dont get set by the polymerField above because they are bound to a varible and dont get set by the id
        if (queryField.Values.length != 0) queryEmpty = false;
      }
    }
    // Perform search if there are values present
    if (!queryEmpty) this.$.results.search();else alert("Please enter data in one of the fields before searching.");
  }
  _copyDatePairToQuery(fromDate, toDate, fieldName) {
    var basicSearchField = this.query.QueryGroups[0].QueryRules.find(f => f.FieldName == fieldName);
    if (fromDate && toDate && fromDate != "" && toDate != "") {
      //Both dates filled in, use range operator, copy both to value
      basicSearchField.Operator = "is in the range";
      basicSearchField.Values = [fromDate, toDate];
    } else if (fromDate && fromDate != "") {
      //From is filled out but to is not, use greater than operator, only copy from to value
      basicSearchField.Operator = "is greater than";
      basicSearchField.Values = [fromDate];
    } else if (toDate && toDate != "") {
      //To is filled out but from is not, use less than operator, only copy to to value
      basicSearchField.Operator = "is less than";
      basicSearchField.Values = [toDate];
    } else {
      //Neither filled out. Make sure value array is empty.
      basicSearchField.Values = [];
    }
  }
  _resetForm() {
    window.location.reload();
  }
  _setLookupDataAjaxResponse(e) {
    if (e.detail.response.length != 0) {
      this.$.State.items = e.detail.response.find(opts => opts.Column == "Event.State").Options;
      this.$.Country.items = e.detail.response.find(opts => opts.Column == "Event.Country").Options;
      this.$.HighestInjury.items = e.detail.response.find(opts => opts.Column == "Event.HighestInjury").Options;
      this.$.Mode.items = e.detail.response.find(opts => opts.Column == "Event.Mode").Options;
      this.$.AircraftCategory.items = e.detail.response.find(opts => opts.Column == "Aircraft.AircraftCategory").Options;
      this.$.RegulationFlightConductedUnder.items = e.detail.response.find(opts => opts.Column == "AviationOperation.RegulationFlightConductedUnder").Options;
    }
  }
  _hideBasicSearch(targetCollection, alternativeClass) {
    if (!targetCollection || targetCollection == "") return "hide";else return alternativeClass;
  }
}
customElements.define('basic-search-page', BasicSearchPage);