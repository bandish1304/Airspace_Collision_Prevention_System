//Main container element for application
import { PolymerElement, html } from "../../../node_modules/@polymer/polymer/polymer-element.js";
import * as settings from "../../../node_modules/@polymer/polymer/lib/utils/settings.js";
import "../../../node_modules/@polymer/app-route/app-location.js";
import "../../../node_modules/@polymer/app-route/app-route.js";
import "../../../node_modules/@polymer/iron-pages/iron-pages.js";
import "../../../node_modules/@polymer/iron-ajax/iron-ajax.js";
import "../../../node_modules/@polymer/app-layout/app-header-layout/app-header-layout.js";
import "../../../node_modules/@polymer/app-layout/app-header/app-header.js";
import "../../../node_modules/@polymer/app-layout/app-toolbar/app-toolbar.js";
import "../../../node_modules/@polymer/paper-tabs/paper-tabs.js";
import "../../../node_modules/@polymer/paper-tabs/paper-tab.js";
import "../../../node_modules/@polymer/paper-icon-button/paper-icon-button.js";
import "../../../node_modules/@polymer/iron-icons/iron-icons.js";
import "../../../node_modules/@polymer/paper-dialog/paper-dialog.js";
import "../../../node_modules/@polymer/paper-menu-button/paper-menu-button.js";
import "../../../node_modules/@polymer/paper-listbox/paper-listbox.js";
import "../../../node_modules/@polymer/paper-item/paper-item.js";
import "../../../node_modules/@polymer/paper-styles/element-styles/paper-material-styles.js";
import { FieldConfigurationsMixin } from '../other/field-configurations-mixin.js';
import '../../css/Common.js';
import "../../../node_modules/@polymer/iron-icons/device-icons.js";
class AppContainer extends FieldConfigurationsMixin(PolymerElement) {
  static get template() {
    return html`
            <style include="common paper-material-styles">
                app-header {
                    background-color: white;
                    box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2),
                                0px 6px 10px 0px rgba(0, 0, 0, 0.14),
                                0px 1px 18px 0px rgba(0, 0, 0, 0.12); }
                }

                .display-header {
                    display: block;
                }

                .hide-header {
                    display: none;
                }

                .width-container {
                    max-width: 1600px;
                    margin: 0px auto;
                }

                .content-container {
                    padding: 15px;
                }

                .toolbar {
                    display: flex;
                    flex-flow: row wrap;
                    justify-content: space-between;
                    background-color: white;
                    align-items: center;
                    color: var(--main-primary-blue);
                }
                    .toolbar img {
                        height: 40px;
                        margin-right: 15px;
                    }
                    .toolbar paper-menu-button, .toolbar paper-icon-button {
                        color: var(--main-primary-blue);
                    }
                    .toolbar a {
                        font-size: 14px;
                        font-weight: bold;
                        padding-right: 15px;
                    }
                   
                .link-container {
                    flex-grow: 100;
                    text-align: right;
                }
               
                .notification {
                    background-color: rgba(66,196,221,0.5);
                    box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12);
                    padding: 10px;
                    text-align: left;
                }

                paper-tabs {
                    --paper-tabs-selection-bar-color: var(--main-light-blue);
                    --paper-tab-ink: var(--main-light-blue);
                    height: 54px;
                }

                paper-tab.iron-selected {
                    font-weight: bold;
                }
                paper-tab:hover {
                    color: var(--main-light-blue);
                }

                .info-dialog-information div {
                    padding: 0px 0px 10px 0px;
                }
                .info-dialog-information-title {
                    font-weight: bold;
                }

                div.disclaimer {
                    color: var(--accents-safety-orange);
                }

                #nav_menu {
                    display: none;
                }
                    #nav_menu paper-item {
                        padding: 5px 10px;
                        color: var(--main-dark-blue);
                    }

                .footer {
                    height: 400px;
                }

                @media screen and (max-width: 675px) {
                    paper-tabs {
                        display: none;
                    }
                    #nav_menu {
                        display: block;
                    }
                }
            </style>

            <app-location route="{{route}}"></app-location>
            <app-route route="{{route}}"
                       pattern="[[routeRoot]]:page"
                       data="{{routeData}}"
                       tail="{{subroute}}"
                       query-params="{{queryParams}}"></app-route>

            <app-header-layout id="header" style="background-color: var(--gray-4, white);">
                <app-header slot="header" fixed class$="[[_getHeaderClass(routeData.page)]]">
                    <div class="toolbar width-container">
                        <paper-tabs selected="{{routeData.page}}" attr-for-selected="name" role="navigation">
                            <paper-tab name="basic-search"><iron-icon icon="search"></iron-icon> BASIC SEARCH</paper-tab>
                            
                            <div class="toolbar width-container"><iron-icon icon="device:airplanemode-active"></iron-icon></iron-icon><a href="[[clientSettings.ExternalURLs.AviationSearchLink]]" style="text-decoration: none;font-weight: 500; padding-right: 0px;" target="_blank">AVIATION SEARCH</a></div>                          
                             
                            <paper-tab name="query-builder"><iron-icon icon="zoom-in"></iron-icon> CUSTOM SEARCH</paper-tab>
                            <template is="dom-if" if="[[!_isFieldDisabled(fieldConfigurations.MySearches)]]">
                                <paper-tab name="my-queries"><iron-icon icon="account-box"></iron-icon> MY SEARCHES</paper-tab>
                            </template>
                            <paper-tab name="published-queries"><iron-icon icon="view-list"></iron-icon> PUBLISHED SEARCHES</paper-tab>
                        </paper-tabs>
                        <paper-menu-button id="nav_menu" horizontal-align="right">
                            <paper-icon-button icon="menu" slot="dropdown-trigger" alt="menu"></paper-icon-button>
                            <paper-listbox slot="dropdown-content" selected="{{routeData.page}}" attr-for-selected="name" role="navigation">
                                <paper-item name="basic-search"><iron-icon icon="search"></iron-icon> SIMPLE SEARCH</paper-item>
                                <paper-item name="query-builder"><iron-icon icon="zoom-in"></iron-icon> ADVANCED SEARCH</paper-item>
                                <template is="dom-if" if="[[!_isFieldDisabled(fieldConfigurations.MySearches)]]">
                                    <paper-item name="my-queries"><iron-icon icon="account-box"></iron-icon> MY SEARCHES</paper-item>
                                </template>
                                <paper-item name="published-queries"><iron-icon icon="view-list"></iron-icon> PUBLISHED SEARCHES</paper-item>
                            </paper-listbox>
                        </paper-menu-button>
                        <paper-icon-button hidden$="[[fieldConfigurations.InfoButton]]" icon="icons:info-outline" on-click="_openInfoButtonClick" class="button-color"></paper-icon-button>
                        <div class="link-container">
                            <a href="[[clientSettings.ExternalURLs.AboutCarolLink]]" target="_blank">HELP</a>
                            <a href="http://ntsb.gov" target="_blank">NTSB HOME</a>
                        </div>
                        <a href="[[clientSettings.ExternalURLs.CarolTitleLink]]" style="text-decoration: none;">
                            <div class="h1">
                                    CAROL Query <span class="disclaimer" hidden>: Internal Data</span>
                            </div>
                        </a>
                        <img src="[[rootPath]]wwwroot/images/BlueSealSmall.png" title="NTSB seal" />
                    </div>
                </app-header>
                <div class="notification">
                    <div class="width-container">
                        <div><strong>CAROL has been upgraded!</strong></div>
                        <div>Experience faster, smarter search with enhanced CAROL.</div>
                        <div>➡️ <a href="https://my.ntsb.gov/home">Go to enhanced CAROL</a></div>
                    </div>
                </div>
                <div class="width-container content-container">                
                    <div class="disclaimer h3" hidden>
                        CAROL internal search: Results for internal NTSB use only
                    </div>
                    <iron-pages selected="[[routeData.page]]" attr-for-selected="name">
                        <aviation-search-page id="aviation_search"  route="" >
                        </aviation-search-page>
                        <landing-page id="landing_page" name="landing-page" route="{{subroute}}" client-settings="[[clientSettings]]"></landing-page>
                        <basic-search-page id="basic_search" name="basic-search" route="{{subroute}}" client-settings="[[clientSettings]]" field-configurations="[[fieldConfigurations]]" session-id="[[sessionId]]" update-saved-queries="{{updateSavedQueries}}" export-max-size="[[exportMaxSize]]"></basic-search-page>
                        <query-builder-page id="query_builder" name="query-builder" route="{{subroute}}" client-settings="[[clientSettings]]" field-configurations="[[fieldConfigurations]]" session-id="[[sessionId]]" update-saved-queries="{{updateSavedQueries}}" export-max-size="[[exportMaxSize]]" query-params="[[queryParams]]"></query-builder-page>
                        
                        <template is="dom-if" if="[[!_isFieldDisabled(fieldConfigurations.MySearches)]]">
                            <my-queries-page id="my_queries" name="my-queries" route="{{subroute}}" session-id="[[sessionId]]" active-user="[[activeUser]]" update-Saved-Queries="{{updateSavedQueries}}" on-query-published="_fireQueryPublished"></my-queries-page>
                        </template>
                        
                        <published-queries-page id="published_queries" name="published-queries" route="{{subroute}}" active-user="[[activeUser]]" session-id="[[sessionId]]"></published-queries-page>
                        <sr-details id="sr_details" name="sr-details" route="{{subroute}}" client-settings="[[clientSettings]]"></sr-details>
                    </iron-pages>
                    </div>
                 <div class="footer"></div>                
            </app-header-layout>

            <paper-dialog id="info_dialog">
                <div class="info-dialog-information">
                    <h2>Information</h2>
                    <div>
                        <a href="[[clientSettings.ExternalURLs.FeedbackLink]]">Send Feedback</a>
                    </div>
                    <div hidden$="[[!clientSettings.InfoSettings.ShowSessionID]]">
                        <span class="info-dialog-information-title">Session ID</span>
                        <br/>
                        <span>[[sessionId]]</span>
                    </div>
                    <div hidden$="[[!clientSettings.InfoSettings.ShowDbBuildDate]]">
                        <span class="info-dialog-information-title">Database Build Date</span>
                        <br/>
                        <span class="db-build-datetime-span"><div style="color:red;">Error Retrieving Data</div></span>
                    </div>
                </div>
                <div class="buttons">
                    <paper-button dialog-dismiss>Close</paper-button>
                </div>
            </paper-dialog>

            <iron-ajax auto url="[[rootPath]]../../api/Session/CreateSession" method="POST" content-type="application/json" last-response="{{sessionId}}"></iron-ajax>
            <iron-ajax auto url="[[rootPath]]../../api/KeyValue/GetDbBuildDateTime" method="GET" on-response="_dbBuildDateTimeResponse"></iron-ajax>
            <iron-ajax auto url="[[rootPath]]../../api/KeyValue/Get/DisabledFeatures" handle-as="json" last-response="{{fieldConfigurations}}"></iron-ajax>
            <iron-ajax auto url="[[rootPath]]../../api/Lookup/ClientSettings/List" handle-as="json" last-response="{{clientSettings}}" on-response="_showDisclaimer"></iron-ajax>
            <iron-ajax auto url="[[rootPath]]../../api/UserManagement/GetApplicationUser/Active" handle-as="json" last-response="{{activeUser}}"></iron-ajax>
        `;
  }
  static get properties() {
    return {
      sessionId: Number,
      activeUser: Object,
      updateSavedQueries: {
        type: Boolean,
        value: false,
        notify: true
      },
      exportMaxSize: Number,
      routeRoot: {
        type: String,
        value: ""
      },
      fieldConfigurations: Object
    };
  }
  static get observers() {
    return ['_pageChanged(routeData.page)'];
  }
  constructor() {
    //This component depends on the root path already being set so we can't pass it in via normal properties (or else it won't be set in time).
    //We set a global variable for it elsewhere for this reason.
    settings.setRootPath(window.Polymer.rootPath);
    super();
  }
  connectedCallback() {
    super.connectedCallback();
    //Set default route to query/home
    var trimmedPath = this.route.path.replace(/\//g, "");
    var trimmedRootPath = this.routeRoot.replace(/\//g, "");
    if (!this.route.path || trimmedPath == "" || trimmedPath.toLowerCase() == trimmedRootPath.toLowerCase()) {
      this.set('route.path', this.routeRoot + 'landing-page');
    }
  }
  _showDisclaimer(e) {
    if (e.detail.response.InfoSettings.ShowDisclaimer) {
      let disclaimers = this.shadowRoot.querySelectorAll(".disclaimer");
      disclaimers.forEach(function (dis) {
        dis.removeAttribute("hidden");
      });
    }
  }
  _dbBuildDateTimeResponse(e) {
    let rawDateTime = e.detail.response;
    if (rawDateTime != null) {
      let formattedDateTime = parseDateTime(rawDateTime);
      let flag = this.shadowRoot.querySelector(".db-build-datetime-span");
      flag.innerHTML = formattedDateTime;
    }
  }
  _fireQueryPublished(e) {
    let publishedQueriesPage = this.$.published_queries;
    if (typeof publishedQueriesPage !== "undefined" && typeof publishedQueriesPage.refresh !== "undefined") {
      publishedQueriesPage.refresh();
    }
  }
  _pageChanged(page) {
    // Load page import on demand
    switch (page) {
      case 'landing-page':
        import('./landing-page.js').then(module => {
          this.$.header.notifyResize();
        });
        break;
      case 'basic-search':
        import('./basic-search-page.js').then(module => {
          this.$.header.notifyResize();
        });
        break;
      case 'query-builder':
        import('./query-builder-page.js').then(module => {
          this.$.header.notifyResize();
        });
        break;
      case 'my-queries':
        import('./my-queries-page.js').then(module => {
          this.$.header.notifyResize();
        });
        break;
      case 'published-queries':
        import('./published-queries-page.js').then(module => {
          this.$.header.notifyResize();
        });
        break;
      case 'sr-details':
        import('./sr-details.js').then(module => {
          this.$.header.notifyResize();
        });
        break;
    }
    this.$.header.notifyResize();
  }
  _getHeaderClass(page) {
    switch (page) {
      case 'sr-details':
        return 'hide-header';
      default:
        return 'display-header';
    }
  }
  _openInfoButtonClick() {
    this.$.info_dialog.open();
  }
}
customElements.define('app-container', AppContainer);