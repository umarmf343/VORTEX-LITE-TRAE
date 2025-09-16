/**
 * Vortex360 Lite - Gutenberg Block
 * 
 * Block editor functionality for the 360° tour viewer
 */

(function() {
    'use strict';
    
    const { registerBlockType } = wp.blocks;
    const { InspectorControls } = wp.blockEditor;
    const { 
        PanelBody, 
        SelectControl, 
        TextControl, 
        ToggleControl, 
        RangeControl,
        Placeholder,
        Spinner,
        Button
    } = wp.components;
    const { Component, Fragment } = wp.element;
    const { __ } = wp.i18n;
    const { apiFetch } = wp;
    
    /**
     * Block icon
     */
    const blockIcon = (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
    );
    
    /**
     * Tour Viewer Block Component
     */
    class TourViewerBlock extends Component {
        constructor(props) {
            super(props);
            
            this.state = {
                isLoading: false,
                tourPreview: null,
                error: null
            };
            
            this.loadTourPreview = this.loadTourPreview.bind(this);
        }
        
        componentDidMount() {
            const { attributes } = this.props;
            if (attributes.tourId) {
                this.loadTourPreview(attributes.tourId);
            }
        }
        
        componentDidUpdate(prevProps) {
            const { attributes } = this.props;
            if (prevProps.attributes.tourId !== attributes.tourId && attributes.tourId) {
                this.loadTourPreview(attributes.tourId);
            }
        }
        
        /**
         * Load tour preview data
         */
        loadTourPreview(tourId) {
            if (!tourId) {
                this.setState({ tourPreview: null, error: null });
                return;
            }
            
            this.setState({ isLoading: true, error: null });
            
            const formData = new FormData();
            formData.append('action', 'vx_get_tour_preview');
            formData.append('tour_id', tourId);
            formData.append('nonce', vxGutenberg.nonce);
            
            fetch(vxGutenberg.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.setState({ 
                        tourPreview: data.data, 
                        isLoading: false,
                        error: null
                    });
                } else {
                    this.setState({ 
                        error: data.data || vxGutenberg.strings.error,
                        isLoading: false,
                        tourPreview: null
                    });
                }
            })
            .catch(error => {
                console.error('VX Block: Error loading tour preview:', error);
                this.setState({ 
                    error: vxGutenberg.strings.error,
                    isLoading: false,
                    tourPreview: null
                });
            });
        }
        
        /**
         * Render tour selection placeholder
         */
        renderPlaceholder() {
            const { attributes, setAttributes } = this.props;
            
            if (vxGutenberg.tours.length === 0) {
                return (
                    <Placeholder
                        icon={blockIcon}
                        label={__('Vortex360 Tour Viewer', 'vortex360-lite')}
                        instructions={vxGutenberg.strings.noTours}
                    >
                        <Button
                            isPrimary
                            href={`${window.location.origin}/wp-admin/post-new.php?post_type=vx_tour`}
                            target="_blank"
                        >
                            {__('Create Tour', 'vortex360-lite')}
                        </Button>
                    </Placeholder>
                );
            }
            
            return (
                <Placeholder
                    icon={blockIcon}
                    label={__('Vortex360 Tour Viewer', 'vortex360-lite')}
                    instructions={vxGutenberg.strings.selectTour}
                >
                    <SelectControl
                        value={attributes.tourId}
                        options={[
                            { value: 0, label: vxGutenberg.strings.selectTour },
                            ...vxGutenberg.tours
                        ]}
                        onChange={(tourId) => setAttributes({ tourId: parseInt(tourId) })}
                    />
                </Placeholder>
            );
        }
        
        /**
         * Render tour preview
         */
        renderPreview() {
            const { attributes } = this.props;
            const { isLoading, tourPreview, error } = this.state;
            
            if (isLoading) {
                return (
                    <div className="vx-block-loading">
                        <Spinner />
                        <p>{vxGutenberg.strings.loading}</p>
                    </div>
                );
            }
            
            if (error) {
                return (
                    <div className="vx-block-error">
                        <p>{error}</p>
                        <Button
                            isSecondary
                            onClick={() => this.loadTourPreview(attributes.tourId)}
                        >
                            {__('Retry', 'vortex360-lite')}
                        </Button>
                    </div>
                );
            }
            
            if (!tourPreview) {
                return this.renderPlaceholder();
            }
            
            const style = {
                width: attributes.width,
                height: attributes.height,
                minHeight: '200px'
            };
            
            return (
                <div className="vx-block-preview" style={style}>
                    <div className="vx-preview-overlay">
                        <div className="vx-preview-info">
                            <h3>{tourPreview.title}</h3>
                            <p>{__('Scenes:', 'vortex360-lite')} {tourPreview.scene_count}</p>
                            <div className="vx-preview-badge">
                                {__('360° Tour Preview', 'vortex360-lite')}
                            </div>
                        </div>
                    </div>
                    {tourPreview.preview_image && (
                        <img 
                            src={tourPreview.preview_image} 
                            alt={tourPreview.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}
                    {!tourPreview.preview_image && (
                        <div className="vx-preview-placeholder">
                            {blockIcon}
                            <p>{tourPreview.title}</p>
                        </div>
                    )}
                </div>
            );
        }
        
        /**
         * Render inspector controls
         */
        renderInspectorControls() {
            const { attributes, setAttributes } = this.props;
            
            return (
                <InspectorControls>
                    <PanelBody title={vxGutenberg.strings.tourSettings} initialOpen={true}>
                        <SelectControl
                            label={__('Select Tour', 'vortex360-lite')}
                            value={attributes.tourId}
                            options={[
                                { value: 0, label: vxGutenberg.strings.selectTour },
                                ...vxGutenberg.tours
                            ]}
                            onChange={(tourId) => setAttributes({ tourId: parseInt(tourId) })}
                        />
                    </PanelBody>
                    
                    <PanelBody title={vxGutenberg.strings.dimensions} initialOpen={false}>
                        <TextControl
                            label={vxGutenberg.strings.width}
                            value={attributes.width}
                            onChange={(width) => setAttributes({ width })}
                            help={__('e.g., 100%, 800px', 'vortex360-lite')}
                        />
                        <TextControl
                            label={vxGutenberg.strings.height}
                            value={attributes.height}
                            onChange={(height) => setAttributes({ height })}
                            help={__('e.g., 600px, 50vh', 'vortex360-lite')}
                        />
                    </PanelBody>
                    
                    <PanelBody title={vxGutenberg.strings.controls} initialOpen={false}>
                        <ToggleControl
                            label={vxGutenberg.strings.showControls}
                            checked={attributes.showControls}
                            onChange={(showControls) => setAttributes({ showControls })}
                        />
                        <ToggleControl
                            label={vxGutenberg.strings.mouseZoom}
                            checked={attributes.mouseZoom}
                            onChange={(mouseZoom) => setAttributes({ mouseZoom })}
                        />
                        <ToggleControl
                            label={vxGutenberg.strings.autoRotate}
                            checked={attributes.autoRotate}
                            onChange={(autoRotate) => setAttributes({ autoRotate })}
                        />
                        {attributes.autoRotate && (
                            <RangeControl
                                label={vxGutenberg.strings.autoRotateSpeed}
                                value={attributes.autoRotateSpeed}
                                onChange={(autoRotateSpeed) => setAttributes({ autoRotateSpeed })}
                                min={1}
                                max={10}
                                step={0.5}
                            />
                        )}
                    </PanelBody>
                    
                    {/* Lite Version Notice */}
                    <PanelBody title={__('Upgrade to Pro', 'vortex360-lite')} initialOpen={false}>
                        <div className="vx-upgrade-notice">
                            <p>{vxGutenberg.strings.upgradeNotice}</p>
                            <Button
                                isPrimary
                                href="#"
                                target="_blank"
                            >
                                {__('Upgrade Now', 'vortex360-lite')}
                            </Button>
                        </div>
                    </PanelBody>
                </InspectorControls>
            );
        }
        
        render() {
            const { attributes } = this.props;
            
            return (
                <Fragment>
                    {this.renderInspectorControls()}
                    <div className="vx-gutenberg-block">
                        {attributes.tourId ? this.renderPreview() : this.renderPlaceholder()}
                    </div>
                </Fragment>
            );
        }
    }
    
    /**
     * Register the block
     */
    registerBlockType('vortex360/tour-viewer', {
        title: __('360° Tour Viewer', 'vortex360-lite'),
        description: __('Display an interactive 360° virtual tour', 'vortex360-lite'),
        icon: blockIcon,
        category: 'media',
        keywords: [
            __('360', 'vortex360-lite'),
            __('tour', 'vortex360-lite'),
            __('virtual', 'vortex360-lite'),
            __('panorama', 'vortex360-lite'),
            __('vortex360', 'vortex360-lite')
        ],
        supports: {
            align: ['wide', 'full'],
            html: false
        },
        attributes: {
            tourId: {
                type: 'number',
                default: 0
            },
            width: {
                type: 'string',
                default: '100%'
            },
            height: {
                type: 'string',
                default: '600px'
            },
            autoLoad: {
                type: 'boolean',
                default: true
            },
            showControls: {
                type: 'boolean',
                default: true
            },
            mouseZoom: {
                type: 'boolean',
                default: true
            },
            autoRotate: {
                type: 'boolean',
                default: false
            },
            autoRotateSpeed: {
                type: 'number',
                default: 2
            },
            className: {
                type: 'string',
                default: ''
            }
        },
        
        edit: TourViewerBlock,
        
        save: function() {
            // Server-side rendering
            return null;
        }
    });
    
})();