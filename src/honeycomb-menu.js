/**
 * @Author: Sian Croser
 * @Date:   2020-04-19T12:09:12+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: honeycomb-menu.js
 * @Last modified by:   Sian Croser <Sian-Lee-SA>
 * @Last modified time: 2020-05-11T20:06:04+09:30
 * @License: GPL-3
 */

const _ = require('lodash');

import "./honeycomb-menu-item.js";
import "./xy-pad.js";
import { objectEvalTemplate, getTemplateOrValue, fireEvent } from "./helpers.js";


const hass = document.querySelector('home-assistant').hass;
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

const manager = new function() {
    this.honeycomb = null;
    this.position = {
        x: 0,
        y: 0
    };
    this.handleXYPosition = function(e) {
        this.position.x = (e.type === "touchstart") ? e.touches[0].clientX : e.clientX;
        this.position.y = (e.type === "touchstart") ? e.touches[0].clientY : e.clientY;
    }.bind(this);
};

document.addEventListener('touchstart', manager.handleXYPosition, false);
document.addEventListener('mousedown', manager.handleXYPosition, false);

function showHoneycombMenu( _config )
{
    // Remove any lingering honeycom menus as there should only be one active at a time
    if( manager.honeycomb )
        manager.honeycomb.close();

    manager.honeycomb = document.createElement('honeycomb-menu');
    // Some configs can be non extensible so we make them
    // extensible
    manager.honeycomb.config = _config;
    manager.honeycomb.display( cardTools.lovelace_view(), manager.position.x, manager.position.y );
    manager.honeycomb.addEventListener('closing', e => {
        manager.honeycomb = null;
    });
}

function traverseConfigs( _config, _buttons )
{
	if( ! _buttons )
	{
		_buttons = new Array(6);
		for( let i = 0; i < 6; i++ )
		{
			_buttons[i] = new Array();
		}
	}

    function bindButtons( _cfg )
    {
        if( _cfg.buttons )
            _cfg.buttons.forEach( (b, i) => {
                if( b.position )
                    _buttons[b.position].unshift(b);
                else
                    _buttons[i].unshift(b);
            });
        return { buttons: _buttons };
    }

    // Allow non extensible to be a new object that can be extended. Using
    // merge will also affect sub properties
    _config = _.merge({}, _config );


    if( ! _config.template ||
        ! cardTools.lovelace.config.honeycomb_menu_templates ||
        ! cardTools.lovelace.config.honeycomb_menu_templates[_config.template]
    ) {
        return Object.assign({}, _config, bindButtons( _config ));
    }

    let parentConfig = traverseConfigs( cardTools.lovelace.config.honeycomb_menu_templates[_config.template], _buttons );

    // Delete the template property so the button doesn't hook into it
    delete _config.template;

    return Object.assign({}, parentConfig, _config, bindButtons( _config ));
}

hass._callService = hass.callService
hass.callService = function(domain, service, data)
{
    if( domain != 'honeycomb' )
        return hass._callService(domain, service, data);

    var honeycombConfig = traverseConfigs( data );

    if( honeycombConfig.entity_id && ! honeycombConfig.entity )
        honeycombConfig.entity = honeycombConfig.entity_id;

    showHoneycombMenu(honeycombConfig);
}

class HoneycombMenu extends Polymer.Element
{
    static get is()
    {
        return 'honeycomb-menu';
    }

    static get properties()
    {
        return {
            hass: Object,
            config: Object,
            sizes: {
                type: Object,
                readonly: true
            },
            variables: Object,
            closing: {
                type: Boolean,
                reflectToAttribute: true,
                value: false
            },
            view: Object,
            buttons: Array,
            _service: {
                type: Object,
                value: {
                    x: false,
                    y: false
                }
            }
        }
    }

    static get template()
    {
        return Polymer.html`
            <style>
            @keyframes fadeIn { from {opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes zoomIn {
              from {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
              }
              50% {
                opacity: 1;
              }
            }
            @keyframes zoomOut {
              from {
                opacity: 1;
              }

              50% {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
              }

              to {
                opacity: 0;
              }
            }

            @keyframes bounceOut {
              20% {
                -webkit-transform: scale3d(0.9, 0.9, 0.9);
                transform: scale3d(0.9, 0.9, 0.9);
              }

              50%,
              55% {
                opacity: 1;
                -webkit-transform: scale3d(1.1, 1.1, 1.1);
                transform: scale3d(1.1, 1.1, 1.1);
              }

              to {
                opacity: 0;
                -webkit-transform: scale3d(0.3, 0.3, 0.3);
                transform: scale3d(0.3, 0.3, 0.3);
              }
            }

            :host {
                position: absolute;
                z-index: 200;
            }
            :host([closing]), :host([closing]) * {
                pointer-events: none !important;
            }
            .shade {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.47);

                animation-duration: 1s;
                animation-fill-mode: both;
                animation-name: fadeIn;
            }
            :host([closing]) .shade {
                animation-name: fadeOut;
                animation-duration: 500ms;
            }
            .honeycombs {
                --filter-color: rgba(0, 0, 0, 0.76);
                filter: drop-shadow(2px 4px 3px var(--filter-color) );
                width: var(--container-width);
                height: var(--container-height);
                pointer-events: none;
            }
            honeycomb-menu-item {
                position: absolute;
                pointer-events: all;
                box-sizing: border-box;
                width: var(--item-size);
                padding: var(--spacing);
            }
            honeycomb-menu-item, xy-pad {
                animation-duration: 1s;
                animation-fill-mode: both;
                animation-name: zoomIn;
            }
            :host([closing]) honeycomb-menu-item, :host([closing]) xy-pad {
                animation-name: zoomOut;
            }
            :host([closing]) honeycomb-menu-item[selected] {
                animation-delay: 800ms !important;
                animation-duration: 0.75s;
                animation-name: bounceOut;
            }
            honeycomb-menu-item:nth-of-type(1), honeycomb-menu-item:nth-of-type(5) {
                left: calc( var(--item-size) * 0.5 );
            }
            honeycomb-menu-item:nth-of-type(2), honeycomb-menu-item:nth-of-type(4) {
                left: calc( var(--item-size) * 1.5);
            }
            honeycomb-menu-item:nth-of-type(3), honeycomb-menu-item:nth-of-type(6) {
                top: calc( var(--item-size) * 0.865);
            }
            honeycomb-menu-item:nth-of-type(4), honeycomb-menu-item:nth-of-type(5) {
                top: calc( var(--item-size) * 1.725);
            }
            honeycomb-menu-item:nth-of-type(3) {
                left: calc( var(--item-size) * 2);
            }
            xy-pad {
                width: var(--container-width);
                height: var(--container-height);
            }
            </style>
            <div id="shade" class="shade" on-click="_handleShadeClick"></div>
            <audio id="audio"></audio>
            <template is="dom-if" if="{{config.xy_pad}}">
                <xy-pad
                    style$="animation-delay: 500ms;"
                    hass="[[hass]]"
                    config="[[config.xy_pad]]"
                    size="[[_computeXYPadSize()]]"
                    clamp-x="[[_computeXYPadClamp()]]"
                    clamp-y="[[_computeXYPadClamp()]]"
                    on-drag="_handleXYPad"
                    on-drag-interval="_handleXYPad"
                    on-drag-end="_handleXYPad">
                </xy-pad>
            </template>

            <div id="honeycombs" class="honeycombs">

                <template is="dom-repeat" items="{{buttons}}">
                    <honeycomb-menu-item
                        hass="[[hass]]"
                        style$="animation-delay: [[_computeAnimateDelay(index)]];"
                        class="animated"
                        config="[[_computeItemConfig(item)]]"
                        on-action="_handleItemAction">
                    </honeycomb-menu-item>
                </template>
            </div>
        `;
    }

    ready()
    {
        super.ready();
        cardTools.provideHass(this);

        _.defaults(this.config, {
            action: 'hold',
            entity: null,
            active: false,
            autoclose: true,
            variables: {},
            size: 225,
            spacing: 2
        });

        // These aren't perfect calculations but produces the result we want
        // honey combs are not 1:1 ratio's
        let itemSize = this.config.size / 3.586;
        this.sizes = {
            item: itemSize,
            containerWidth: itemSize * 3,
            containerHeight: itemSize * 2.9
        };

        this._assignButtons();
    }

    display(_view, _x, _y)
    {
        this.view = _view;
        this.view.style.position = 'relative';

        this.view.append( this );

        this._setPosition( _x, _y );
        this._setCssVars();
    }

    close( _item = null )
    {
        if( this.closing )
            return;

        this.closing = true;

        if( _item ) _item.setAttribute('selected', '');

        fireEvent(this, 'closing', { item: _item });
        // Remove shade div earlier to allow clicking of other lovelace elements while the animation continues
        this.$.shade.addEventListener('animationend', function(e) {
            this.remove();
        });
        this.shadowRoot.querySelectorAll('honeycomb-menu-item')[5].addEventListener('animationend', e => {
            this.remove();
            fireEvent(this, 'closed', { item: _item });
        });
    }

    _assignButtons()
    {
        this.buttons = [];
        for( let i = 0; i < 6; i++ )
        {
            let button = {};

			for( let b of this.config.buttons[i] )
			{
				if( b.show !== undefined )
                {
                    b.show = getTemplateOrValue( this.hass, this.hass.states[this.config.entity], this.config.variables, b.show )
                } else if( b != 'break' && b != 'skip') {
                     b.show = true;
                }

                if( b != 'break' && (! b.show || b == 'skip') )
                    continue;
                    
				button = b;
				break;
			}

            if( button == 'break' )
                button = {};

            // Clone to allow writable object from button-card
            this.buttons[i] = _.merge({}, button);
        }
    }

    _setPosition( _x, _y )
    {
        let container = {
            w: ( this.sizes.containerWidth / 2 ),
            h: ( this.sizes.containerHeight / 2 )
        };

        let bounds =  {
            min: {
                x: parseFloat( window.getComputedStyle(this.view, null).getPropertyValue('padding-left') ) + container.w,
                y: parseFloat( window.getComputedStyle(this.view, null).getPropertyValue('padding-top') ) + container.h
            },
            max: {
                x: this.view.clientWidth - container.w,
                y: this.view.clientHeight - container.h
            }
        }

        let rect = this.view.getBoundingClientRect();
        _x = _.clamp( _x - rect.left, bounds.min.x, bounds.max.x );
        _y = _.clamp( _y - rect.top, bounds.min.y, bounds.max.y );

        this.style.left = `${_x - container.w}px`;
        this.style.top = `${_y - container.h}px`;
    }

    _setCssVarProperty(orig_property, var_property)
    {
        this.$.honeycombs.style.setProperty(orig_property, `var(${var_property}, ${this.view.style.getPropertyValue(orig_property)})`, "important");
    }

    _setCssVars()
    {
        this.style.setProperty('--item-size', `${this.sizes.item}px` );
        this.style.setProperty('--container-width', `${this.sizes.containerWidth}px`);
        this.style.setProperty('--container-height', `${this.sizes.containerHeight}px`);

        this.style.setProperty('--spacing', `${this.config.spacing}px`);

        this._setCssVarProperty('--paper-item-icon-color', '--honeycomb-menu-icon-color');
        this._setCssVarProperty('--paper-item-icon-active-color', '--honeycomb-menu-icon-active-color');
        this._setCssVarProperty('--ha-card-background', '--honeycomb-menu-background-color');
        this._setCssVarProperty('--ha-card-active-background', '--honeycomb-menu-active-background-color');
    }

    _handleShadeClick(e)
    {
        e.cancelBubble = true;
        this.close();
    }

    _handleItemAction(e)
    {
        if( ! e.detail.item )
            return;

        this._playButtonSound( e.detail.item );

        if( e.detail.autoclose )
            this.close(e.detail.item);
    }

    _playButtonSound( _item )
    {
        if( ! _item.config.audio )
            return;
        this.$.audio.src = _item.config.audio;
        this.$.audio.play();
    }

    _handleXYPad(e)
    {
        if( (this.config.xy_pad.on_release && e.type != 'drag-end') ||
            (this.config.xy_pad.repeat && e.type != 'drag-interval')
        ) return;

        ['x', 'y'].forEach( axis => {
            let config = this.config.xy_pad[axis];

            if( e.detail[axis] == 0 || ! config || ! config.service || this._service[axis] )
                return;

            this._service[axis] = true;
            let service = _.split( config.service, '.', 2);
            this.hass
                .callService( service[0], service[1], this.__renderServiceData(e.detail, config.service_data) )
                .then(e => this._service[axis] = false);

        });
    }

    __renderServiceData( vars, data )
    {
        if( ! data )
            return new Object();

        return objectEvalTemplate( this.hass, this.hass.states[this.config.entity], {}, data, (val) => {
            if( val == 'entity' )
                return this.config.entity;
            return _.template(val)(vars);
        });
    }

    _computeXYPadSize()
    {
        return this.config.size / 6;
    }

    _computeXYPadClamp()
    {
        return this.config.size / 3;
    }

    _computeItemSize()
    {
        return this.config.size / 3;
    }

    _computeItemConfig( item )
    {
        if( _.isEmpty(item) )
            return item;
        return _.omit( _.merge( {}, this.config, item ), ['buttons', 'size', 'action', 'xy_pad', 'spacing'] );
    }

    _computeAnimateDelay( i )
    {
        return 125 * i + 'ms';
    }
}
customElements.define(HoneycombMenu.is, HoneycombMenu);
