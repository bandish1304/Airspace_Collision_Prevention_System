import { PolymerElement, html } from "../../../node_modules/@polymer/polymer/polymer-element.js";
import "../../../node_modules/@vaadin/vaadin-grid/theme/material/all-imports.js";
import "../../../node_modules/@vaadin/vaadin-grid/theme/lumo/vaadin-grid-styles.js";
import "../../../node_modules/@polymer/paper-icon-button/paper-icon-button.js";
import "../../../node_modules/@polymer/iron-icons/device-icons.js";
import "../../../node_modules/@polymer/iron-icons/maps-icons.js";
import "../../../node_modules/@polymer/iron-icons/editor-icons.js";
import "../../../node_modules/@polymer/iron-icons/image-icons.js";
import '../../css/Common.js';
import '../../css/custom-grid-style.js';
import './expand-result-view-cases.js';
import { ResultsTableMixin } from './results-table-mixin.js';
import { FieldConfigurationsMixin } from '../other/field-configurations-mixin.js';
import { StringFormat } from '../other/string-format.js';
class ResultsTableCases extends StringFormat(FieldConfigurationsMixin(ResultsTableMixin(PolymerElement))) {
  static get template() {
    return html`
            <style include="common ntsb-public">
                .step-color-1 { background-color: #9ae3dc; }
                .step-color-2 { background-color: #9fe67a; }
                .step-color-3 { background-color: #f0b71a; }
                .step-color-4 { background-color: #F09835; }
                .step-color-5 { background-color: #E87226; }
                .step-color-6 { background-color: #d94d2e; }
                .step-color-7 { background-color: #595959; }
                .step-color-8 { background-color: #595959; }   

                .circle {
                    width: 25px;
                    height: 25px;
                    border-radius: 50%;
                    text-align: center;
                    margin-right: 10px;
                    color: white;
                    display: inline-block;
                }
                    .circle > div  {
                        margin-top: 2px;
                    }

                .expand-icon {
                    margin-left: -7px;
                }
            </style>

            <vaadin-grid id="grid" items="[[results]]" column-reordering-allowed height-by-rows theme="row-stripes wrap-cell-content ntsb-public compact">
                <template class="row-details">
                    <expand-result-view-cases mkey="[[_extractResultValue(item.Fields, 'Mkey')]]" sr-link="[[clientSettings.ExternalURLs.SrLink]]" open="[[detailsOpened]]" on-details-loaded="_resizeGrid"></expand-result-view-sr>
                </template>
                <vaadin-grid-column id="expand_icon" width="50px" flex-grow="0">
                    <template>
                        <paper-icon-button class="expand-icon" style="color: var(--main-primary-blue)" id="open_expand_view_[[index]]" on-click="_toggleDetails" icon$="[[_setDetailButtonIcon(detailsOpened)]]"></paper-icon-button>
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'NtsbNo')]]" resizable width="210px" flex-grow="0">
                    <template class="header">
                        <vaadin-grid-sorter path="Event.NTSBNumber" on-direction-changed="_sortColumnChanged">NTSB#</vaadin-grid-sorter>
                    </template>
                    <template>
                        <iron-icon icon$="[[_setModeIcon(item.Fields, 'Mode')]]"></iron-icon>
                        <a hidden$="[[_isFieldDisabled(fieldConfigurations.SaftiCaseLink)]]" target="_blank" href$="[[_saftiLink(item.Fields, clientSettings.ExternalURLs.SaftiModalCaseUrls)]]">
                            [[_formatNtsbNo(item.Fields)]]
                        </a>
                        <span hidden$="[[!_isFieldDisabled(fieldConfigurations.SaftiCaseLink)]]">
                            [[_formatNtsbNo(item.Fields)]]
                        </span>
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'Mkey')]]" resizable width="107px" flex-grow="0" header="Public Docket">
                    <template>
                        <a target="_blank" hidden$="[[_hideDocketLink(item.Fields)]]" href$="[[_docketLink(item.Fields, clientSettings.ExternalURLs.DocketLink)]]">
                            Docket
                        </a>
                    </template>
                </vaadin-grid-column>
                           
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'EventDate')]]" resizable width="110px" flex-grow="0">
                    <template class="header">
                        <vaadin-grid-sorter path="Event.EventDate" on-direction-changed="_sortColumnChanged">Event Date</vaadin-grid-sorter>
                    </template>
                    <template>
                        [[_formatLocalDate(item.Fields, "EventDate")]]
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideLocationDisplayColumn(columns)]]" resizable>
                    <template class="header">
                        <vaadin-grid-sorter path="Event.City" on-direction-changed="_sortColumnChanged">Location</vaadin-grid-sorter>
                    </template>
                    <template>
                        [[_formatLocation(item.Fields)]]
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'Iic')]]" resizable>
                    <template class="header">
                        <vaadin-grid-sorter path="Event.IicName" on-direction-changed="_sortColumnChanged">IIC</vaadin-grid-sorter>
                    </template>
                    <template>
                        [[_extractResultValue(item.Fields, "Iic")]]
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'ReportNo')]]" resizable header="Report">
                    <template>
                        <a target="_blank" hidden$="[[_hideReportLink(item.Fields, 'accident')]]" href$="[[_caseReportLink(item.Fields, clientSettings.ExternalURLs.AccidentReportLink, 'NtsbNo')]]">
                            [[_extractResultValue(item.Fields, "ReportNo")]]
                        </a>
                        <div hidden$="[[_hideReportLink(item.Fields, 'safti')]]">
                            <a target="_blank" href$="[[_caseReportLink(item.Fields, clientSettings.ExternalURLs.SaftiReportLink, 'Mkey')]]">
                                <iron-icon icon="image:picture-as-pdf"></iron-icon>[[_extractResultValue(item.Fields, "MostRecentReportType")]]
                            </a>
                        </div>
                        <div hidden$ = "[[!_hideReportLink(item.Fields, 'accident') ]]">
                        <a target="_blank" hidden$="[[_hidePDFReportLink(item.Fields,1)]]" href$="[[_evIDLink(item.Fields, clientSettings.ExternalURLs.SaftiReportLinkEvID,1)]]" />
                        <iron-icon icon="image:picture-as-pdf"></iron-icon> Final
                        </a>
                         <a target="_blank" hidden$="[[_hidePDFReportLink(item.Fields,2)]]" href$="[[_evIDLink(item.Fields, clientSettings.ExternalURLs.SaftiReportLinkEvID,2)]]" />
                        <br>Final(2)
                        </a>
                         <a target="_blank" hidden$="[[_hideHTMLReportLink(item.Fields,1)]]" href$="[[_evIDLink(item.Fields, clientSettings.ExternalURLs.SaftiHtmlReportLinkEvID,1)]]" />
                        Final Report (HTML)  
                        </a>
                         <a target="_blank" hidden$="[[_hideHTMLReportLink(item.Fields,2)]]" href$="[[_evIDLink(item.Fields, clientSettings.ExternalURLs.SaftiHtmlReportLinkEvID,2)]]" />
                        <br>Final Report (HTML)(2)  
                        </a>
                        
                        </div>
                        <div >                        
                         <a hidden$="[[_hideReportNone(item.Fields)]]" target="_blank"  href$="[[clientSettings.ExternalURLs.ForeignReportLink]]" />
                        Foreign
                        </a>
                        </div>

                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'OriginalPublishedDate')]]" resizable width="110px" flex-grow="0">
                    <template class="header">
                        <vaadin-grid-sorter path="Event.OriginalPublishedDate" on-direction-changed="_sortColumnChanged">Original Published Date</vaadin-grid-sorter>
                    </template>
                    <template>
                        [[_formatLocalDate(item.Fields, "OriginalPublishedDate")]]
                    </template>
                </vaadin-grid-column>
                <!-- <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'ReportDate')]]" resizable width="150px" flex-grow="0">
                    <template class="header">
                        <vaadin-grid-sorter path="Event.ReportDate" on-direction-changed="_sortColumnChanged">Report Date</vaadin-grid-sorter>
                    </template>
                    <template>
                        [[_formatDate(item.Fields, "ReportDate")]]
                    </template>
                </vaadin-grid-column> -->
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'EventType')]]" resizable width="150px" flex-grow="0">
                    <template class="header">
                        <vaadin-grid-sorter path="Event.EventType" on-direction-changed="_sortColumnChanged">Event Type</vaadin-grid-sorter>
                    </template>
                    <template>
                        [[_extractResultValue(item.Fields, "EventType")]]                       
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'HighestInjuryLevel')]]" resizable header="Highest Injury">
                    <template>
                        [[_extractResultValue(item.Fields, "HighestInjuryLevel")]]
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column resizable header="Aircraft Details">
                    <template>
                        [[_formatAircraftDetails(item.Fields)]]
                    </template>
                </vaadin-grid-column>
               <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'CompletionStatus')]]" resizable header="Status">
                    <template>
                        [[_extractResultValue(item.Fields, "CompletionStatus")]]
                    </template>
                </vaadin-grid-column>
                <vaadin-grid-column hidden$="[[_hideDisplayColumn(columns, 'HasSafetyRec')]]" resizable width="115px" flex-grow="0">
                    <template class="header">
                        <vaadin-grid-sorter path="HasSafetyRec" on-direction-changed="_sortColumnChanged">Has Safety Rec</vaadin-grid-sorter>
                    </template>
                    <template>
                        <iron-icon icon$="[[_setBoolIcon(item.Fields, 'HasSafetyRec')]]"></iron-icon>
                    </template>
                </vaadin-grid-column>
            </vaadin-grid>
        `;
  }
  _docketLink(fields, docketLink) {
    var mkey = this._extractResultValue(fields, "Mkey");
    return docketLink.replace("${Mkey}", mkey);
  }
  _evIDLink(fields, evLink, aKey) {
    let evID = "";
    let repGenFlag = "";
    evID = this._extractResultValue(fields, "EV_ID");
    repGenFlag = this._extractResultValue(fields, "RepGenFlag");
    if (repGenFlag && repGenFlag.indexOf(',') <= 0) aKey = repGenFlag.trim();
    if (evID && evID.indexOf(',') > 0) {
      if (aKey == 2) {
        evID = evID.substring(evID.indexOf(',') + 1, evID.length);
        if (repGenFlag && repGenFlag.indexOf(',') > 0) repGenFlag = repGenFlag.substring(repGenFlag.indexOf(',') + 1, repGenFlag.length);
      } else {
        evID = evID.substring(0, evID.indexOf(','));
        if (repGenFlag && repGenFlag.indexOf(',') > 0) repGenFlag = repGenFlag.substring(0, repGenFlag.indexOf(','));
      }
      evID = evID.trim();
      aKey = repGenFlag.trim();
    }
    evLink = evLink.replace("${EV_ID}", evID);
    var investigationType = "";
    let ntsbNumber = this._extractResultValue(fields, "NtsbNo");
    if (ntsbNumber) {
      investigationType = "";
      if (ntsbNumber.length > 6) {
        investigationType = ntsbNumber.substring(5, 7);
        if (ntsbNumber.length > 8) {
          if (ntsbNumber.substring(5, 9).toUpperCase() == "FAMS") {
            investigationType = "FAMS";
          }
        }
      }
    }
    evLink = evLink.replace("${IType}", investigationType);
    return evLink.replace("${AKey}", aKey);
  }
  _hidePDFReportLink(fields, lnkNum) {
    let nNumList = this._extractResultValueList(fields, "N#").length;
    if (lnkNum > nNumList) return true;
    let evID = this._extractResultValue(fields, "EV_ID");
    if (!evID) return true;
    let repGenFlag = this._extractResultValue(fields, "RepGenFlag");
    if (!repGenFlag) return true;
    if (repGenFlag.indexOf(',') > 0) {
      if (lnkNum == 1) repGenFlag = repGenFlag.substring(0, repGenFlag.indexOf(','));else repGenFlag = repGenFlag.substring(repGenFlag.indexOf(',') + 1, repGenFlag.length);
    }
    if (repGenFlag == 0) return true;
    return false;
  }
  _hideHTMLReportLink(fields, lnkNum) {
    let nNumList = this._extractResultValueList(fields, "N#").length;
    if (lnkNum > nNumList) return true;
    let evID = this._extractResultValue(fields, "EV_ID");
    if (!evID) return true;
    let repGenFlag = this._extractResultValue(fields, "RepGenFlag");
    if (!repGenFlag) return true;
    if (repGenFlag.indexOf(',') > 0) {
      if (lnkNum == 1) repGenFlag = repGenFlag.substring(0, repGenFlag.indexOf(','));else repGenFlag = repGenFlag.substring(repGenFlag.indexOf(',') + 1, repGenFlag.length);
    }
    if (repGenFlag != 0) return true;
    return false;
  }
  _hideDocketLink(fields) {
    let docketPublishDate = this._extractResultValue(fields, "DocketPublishDate");
    if (!docketPublishDate) return true;
    let datePublishDateUtc = new Date(docketPublishDate);
    let dateNow = new Date();
    let dateUtcNowString = dateNow.toUTCString();
    let utcDateNow = new Date(dateUtcNowString);
    return datePublishDateUtc > utcDateNow;
  }
  _saftiLink(fields, saftiCaseUrls) {
    if (fields && saftiCaseUrls) {
      var mkey = this._extractResultValue(fields, "Mkey");
      var mode = this._extractResultValue(fields, "Mode");
      let isStudy = this._extractResultValue(fields, "IsStudy");
      var urlObj = saftiCaseUrls.find(element => element.Mode == mode.toLowerCase());
      if (urlObj) {
        if (isStudy == "true") urlObj.Url = urlObj.Url.replace("case/", "study/");
        return urlObj.Url.replace("${Mkey}", mkey);
      } else {
        return this.clientSettings.ExternalURLs.SaftiUrl;
      }
    }
  }
  _formatNtsbNo(fields) {
    var ntsbNo = this._extractResultValue(fields, "NtsbNo");
    return ntsbNo && ntsbNo != "" ? ntsbNo : "Pending";
  }
  _resizeGrid() {
    this.$.grid.notifyResize();
  }
}
customElements.define('results-table-cases', ResultsTableCases);