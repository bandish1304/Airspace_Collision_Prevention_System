import { PolymerElement, html } from "../../../node_modules/@polymer/polymer/polymer-element.js";
import "../../../node_modules/@polymer/paper-button/paper-button.js";
import "../../../node_modules/@polymer/paper-dialog/paper-dialog.js";
import "../../../node_modules/@polymer/paper-spinner/paper-spinner-lite.js";
import "../../../node_modules/@polymer/iron-ajax/iron-ajax.js";
import '../../css/Common.js';
class ExpandResultViewCases extends PolymerElement {
  static get template() {
    return html`
            <style include="common">
            </style>

            <paper-spinner-lite id="loading" active></paper-spinner-lite>

            <div class="flex-container">
                <div class="flex-item">
                    <div style="font-weight: bold;">
                        Vehicle(s)
                    </div>
                    <template id="vehicle_template" is="dom-repeat" items="[[results.Vehicles]]">
                        [[_getModalMultiVehicleData(results.Mode, item, results.Lookups)]]
                        <br>
                    </template>
                    [[_getModalSingleVehicleData(results.Mode, results, results.Lookups)]]
                </div>
                <div hidden$="[[_hideFindings(results.Vehicles)]]" class="flex-item">
                    <div style="font-weight: bold;">
                        Findings
                    </div>
                    <template id="findings_template" is="dom-repeat" items="[[results.Vehicles]]">
                        <template id="findings_template_inner" is="dom-repeat" items="[[item.Findings]]" as="findingItem">
                            [[findingItem.FindingReportText]]
                            <br>
                        </template>
                    </template>
                </div class="flex-item">
                <div hidden$="[[!results.CaseClosed]]" class="flex-item">
                    <div style="font-weight: bold;">
                        Probable Cause
                    </div>
                    [[results.ProbableCause]]
                </div>
                <div hidden$="[[_hideSrRecommendation(results.SrData)]]" class="flex-item">
                    <div style="font-weight: bold;">
                        Recommendations
                    </div>
                    <template id="sr_link_template" is="dom-repeat" items="[[results.SrData]]">
                        <a target="_blank" href$="[[rootPath]]../../sr-details/[[item.Srid]]">
                            [[item.Srid]]
                        </a>
                        <br>
                    </template>
                </div>
                
                  <div hidden$="[[!results.AssociatedNTSBNumbers]]" class="flex-item">
                    <div style="font-weight: bold;">
                        Associated NTSB#(s)
                    </div>
                    [[results.AssociatedNTSBNumbers]]
                   
                </div>
            </div>

            <iron-ajax id="details_ajax" 
                       url="[[rootPath]]../../api/Query/GetCaseRecord/[[mkey]]" 
                       method="GET" 
                       last-response={{results}} 
                       content-type="application/json" 
                       loading="{{loading}}" 
                       on-error="_loadDetailsError"
                       on-response="_loadDetailsResponse"></iron-ajax>
        `;
  }
  static get properties() {
    return {
      open: {
        type: Boolean,
        value: false,
        observer: "_openChanged"
      },
      mkey: String,
      results: Object,
      srLink: String
    };
  }
  ready() {
    super.ready();
    let globalScope = this;
    this.$.vehicle_template.addEventListener("dom-change", function (e) {
      globalScope.dispatchEvent(new CustomEvent('details-loaded'));
    });
    this.$.findings_template.addEventListener("dom-change", function (e) {
      let findingInnerList = globalScope.shadowRoot.querySelectorAll('#findings_template_inner');
      for (let i = 0; i < findingInnerList.length; i++) {
        findingInnerList[i].addEventListener("dom-change", function (e) {
          globalScope.dispatchEvent(new CustomEvent('details-loaded'));
        });
      }
    });
    this.$.sr_link_template.addEventListener("dom-change", function (e) {
      globalScope.dispatchEvent(new CustomEvent('details-loaded'));
    });
  }
  _openChanged(open) {
    //When the results view is opened
    if (open == true) {
      this.$.details_ajax.generateRequest();
    }
  }
  _loadDetailsResponse(e) {
    this.$.loading.classList.add("hide");
    this.$.wrapper.classList.remove("hide");
  }
  _loadDetailsError(e) {
    alert("Error loading details for this mkey (" + this.mkey + ")");
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
  _getLookupValue(columnName, columnValue, lookupData) {
    let retVal = columnValue;
    let foundCol = lookupData.find(f => {
      return f.Column == columnName;
    });
    if (foundCol && foundCol.Options) {
      let foundOption = foundCol.Options.find(f => {
        return f.Value == columnValue;
      });
      retVal = foundOption != null ? foundOption.DisplayText : columnValue;
    }
    return retVal;
  }
  _hideSrRecommendation(srData) {
    return !srData || srData.length == 0;
  }
  _hideFindings(vehicles) {
    if (!vehicles) return true;
    let hidden = true;
    for (let i = 0; i < vehicles.length; i++) {
      if (!vehicles[i].Findings) continue;
      if (vehicles[i].Findings.length > 0) {
        hidden = false;
        break;
      }
    }
    return hidden;
  }
  _getModalMultiVehicleData(mode, item, lookups) {
    let retVal = "";
    switch (mode) {
      case "Aviation":
        let makeLookup = this._getLookupValue('AircraftMake', item.Make, lookups);
        let modelLookup = this._getLookupValue('AircraftModel', item.Model, lookups);
        retVal += item.RegistrationNumber != null ? item.RegistrationNumber : "";
        retVal += makeLookup != null ? " " + makeLookup : "";
        retVal += modelLookup != null ? " " + modelLookup : "";
        break;
      case "Marine":
        let vesselTypeLookup = this._getLookupValue('VesselType', item.VesselType, lookups);
        retVal += item.VesselName != null ? item.VesselName : "";
        retVal += vesselTypeLookup != null ? " (" + vesselTypeLookup + ")" : "";
        break;
      case "Highway":
        let vehicleTypeLookup = this._getLookupValue('VehicleType', item.TrafficUnitType, lookups);
        retVal += item.TrafficUnitName != null ? item.TrafficUnitName : "";
        retVal += vehicleTypeLookup != null ? " " + vehicleTypeLookup : "";
        break;
      case "Railroad":
        retVal = item.TrainName != null ? item.TrainName : "";
        break;
    }
    return retVal;
  }
  _getModalSingleVehicleData(mode, results, lookups) {
    let retVal = "";
    switch (mode) {
      case "Hazmat":
        let hazardClassLookup = this._getLookupValue('HazardClass', results.HazardClass, lookups);
        retVal += results.OperatorName != null ? results.OperatorName : "";
        retVal += hazardClassLookup != null ? " " + hazardClassLookup : "";
        break;
      case "Pipeline":
        let pipelineTypeLookup = this._getLookupValue('PipelineType', results.PipelineType, lookups);
        retVal += results.PipelineOperatorName != null ? results.PipelineOperatorName : "";
        retVal += pipelineTypeLookup != null ? " " + pipelineTypeLookup : "";
        break;
    }
    return retVal;
  }
}
customElements.define('expand-result-view-cases', ExpandResultViewCases);