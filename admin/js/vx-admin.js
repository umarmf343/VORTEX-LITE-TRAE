/**
 * Vortex360 Lite - Admin JavaScript
 * 
 * Main admin interface functionality
 */

(function($) {
    'use strict';

    /**
     * Admin functionality object
     */
    const VXAdmin = {
        
        /**
         * Initialize admin functionality
         */
        init: function() {
            this.bindEvents();
            this.initTooltips();
            this.initShortcodeCopy();
            this.initUpgradeNotices();
            this.initSettingsValidation();
        },

        /**
         * Bind event handlers
         */
        bindEvents: function() {
            // Settings form validation
            $(document).on('submit', '.vx-settings-form', this.validateSettings);
            
            // Bulk actions
            $(document).on('click', '.vx-bulk-action', this.handleBulkAction);
            
            // Tour actions
            $(document).on('click', '.vx-duplicate-tour', this.duplicateTour);
            $(document).on('click', '.vx-export-tour', this.exportTour);
            $(document).on('click', '.vx-delete-tour', this.deleteTour);
            
            // Import functionality
            $(document).on('change', '#vx-import-file', this.handleImportFile);
            $(document).on('click', '.vx-import-tour', this.importTour);
            
            // Upgrade notices
            $(document).on('click', '.vx-dismiss-notice', this.dismissNotice);
            
            // Help tooltips
            $(document).on('mouseenter', '.vx-help-tooltip', this.showTooltip);
            $(document).on('mouseleave', '.vx-help-tooltip', this.hideTooltip);
        },

        /**
         * Initialize tooltips
         */
        initTooltips: function() {
            $('.vx-help-tooltip').each(function() {
                const $this = $(this);
                const title = $this.attr('title');
                if (title) {
                    $this.attr('data-tooltip', title).removeAttr('title');
                }
            });
        },

        /**
         * Initialize shortcode copy functionality
         */
        initShortcodeCopy: function() {
            $(document).on('click', '.vx-shortcode-copy', function(e) {
                e.preventDefault();
                const $this = $(this);
                const shortcode = $this.text();
                
                // Copy to clipboard
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(shortcode).then(function() {
                        VXAdmin.showCopySuccess($this);
                    }).catch(function() {
                        VXAdmin.fallbackCopyTextToClipboard(shortcode, $this);
                    });
                } else {
                    VXAdmin.fallbackCopyTextToClipboard(shortcode, $this);
                }
            });
        },

        /**
         * Show copy success feedback
         */
        showCopySuccess: function($element) {
            const originalText = $element.text();
            $element.addClass('copied').text('Copied!');
            
            setTimeout(function() {
                $element.removeClass('copied').text(originalText);
            }, 2000);
        },

        /**
         * Fallback copy to clipboard
         */
        fallbackCopyTextToClipboard: function(text, $element) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showCopySuccess($element);
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            
            document.body.removeChild(textArea);
        },

        /**
         * Initialize upgrade notices
         */
        initUpgradeNotices: function() {
            // Auto-show upgrade notice after certain actions
            const showUpgradeAfter = ['scene_limit_reached', 'hotspot_limit_reached', 'feature_locked'];
            const urlParams = new URLSearchParams(window.location.search);
            
            showUpgradeAfter.forEach(function(param) {
                if (urlParams.get(param)) {
                    VXAdmin.showUpgradeModal();
                }
            });
        },

        /**
         * Show upgrade modal
         */
        showUpgradeModal: function() {
            // Create modal if it doesn't exist
            if (!$('#vx-upgrade-modal').length) {
                const modal = `
                    <div id="vx-upgrade-modal" class="vx-modal" style="display: none;">
                        <div class="vx-modal-content">
                            <div class="vx-modal-header">
                                <h3>Upgrade to Vortex360 Pro</h3>
                                <span class="vx-modal-close">&times;</span>
                            </div>
                            <div class="vx-modal-body">
                                <p>You've reached the limits of the Lite version. Upgrade to Pro for:</p>
                                <ul>
                                    <li>Unlimited scenes and hotspots</li>
                                    <li>Advanced hotspot types</li>
                                    <li>Custom branding options</li>
                                    <li>Priority support</li>
                                </ul>
                            </div>
                            <div class="vx-modal-footer">
                                <a href="#" class="button button-primary vx-upgrade-btn">Upgrade Now</a>
                                <button class="button vx-modal-close">Maybe Later</button>
                            </div>
                        </div>
                    </div>
                `;
                $('body').append(modal);
            }
            
            $('#vx-upgrade-modal').fadeIn();
            
            // Close modal events
            $(document).on('click', '.vx-modal-close, #vx-upgrade-modal', function(e) {
                if (e.target === this) {
                    $('#vx-upgrade-modal').fadeOut();
                }
            });
        },

        /**
         * Initialize settings validation
         */
        initSettingsValidation: function() {
            // Real-time validation for settings
            $(document).on('input', '.vx-settings-form input, .vx-settings-form select', function() {
                const $field = $(this);
                VXAdmin.validateField($field);
            });
        },

        /**
         * Validate individual field
         */
        validateField: function($field) {
            const fieldType = $field.attr('type') || $field.prop('tagName').toLowerCase();
            const value = $field.val();
            let isValid = true;
            let message = '';
            
            // Remove existing validation
            $field.removeClass('vx-field-error vx-field-success');
            $field.siblings('.vx-field-message').remove();
            
            // Validate based on field type
            switch (fieldType) {
                case 'email':
                    if (value && !this.isValidEmail(value)) {
                        isValid = false;
                        message = 'Please enter a valid email address.';
                    }
                    break;
                    
                case 'url':
                    if (value && !this.isValidUrl(value)) {
                        isValid = false;
                        message = 'Please enter a valid URL.';
                    }
                    break;
                    
                case 'number':
                    const min = parseInt($field.attr('min'));
                    const max = parseInt($field.attr('max'));
                    const numValue = parseInt(value);
                    
                    if (value && isNaN(numValue)) {
                        isValid = false;
                        message = 'Please enter a valid number.';
                    } else if (!isNaN(min) && numValue < min) {
                        isValid = false;
                        message = `Value must be at least ${min}.`;
                    } else if (!isNaN(max) && numValue > max) {
                        isValid = false;
                        message = `Value must be no more than ${max}.`;
                    }
                    break;
            }
            
            // Apply validation styling
            if (!isValid) {
                $field.addClass('vx-field-error');
                $field.after(`<div class="vx-field-message error">${message}</div>`);
            } else if (value) {
                $field.addClass('vx-field-success');
            }
            
            return isValid;
        },

        /**
         * Validate settings form
         */
        validateSettings: function(e) {
            const $form = $(this);
            let isValid = true;
            
            // Validate all fields
            $form.find('input, select').each(function() {
                if (!VXAdmin.validateField($(this))) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                VXAdmin.showMessage('Please correct the errors above.', 'error');
            }
        },

        /**
         * Handle bulk actions
         */
        handleBulkAction: function(e) {
            e.preventDefault();
            const action = $('#bulk-action-selector-top').val();
            const selected = $('input[name="post[]"]:checked');
            
            if (!action || action === '-1') {
                VXAdmin.showMessage('Please select an action.', 'warning');
                return;
            }
            
            if (selected.length === 0) {
                VXAdmin.showMessage('Please select at least one tour.', 'warning');
                return;
            }
            
            // Confirm destructive actions
            if (action === 'trash' || action === 'delete') {
                const confirmMessage = action === 'delete' 
                    ? 'Are you sure you want to permanently delete the selected tours?'
                    : 'Are you sure you want to move the selected tours to trash?';
                    
                if (!confirm(confirmMessage)) {
                    return;
                }
            }
            
            // Process bulk action
            VXAdmin.processBulkAction(action, selected);
        },

        /**
         * Process bulk action
         */
        processBulkAction: function(action, selected) {
            const tourIds = selected.map(function() {
                return $(this).val();
            }).get();
            
            VXAdmin.showLoading();
            
            $.ajax({
                url: vxAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_bulk_action',
                    bulk_action: action,
                    tour_ids: tourIds,
                    nonce: vxAdmin.nonce
                },
                success: function(response) {
                    VXAdmin.hideLoading();
                    
                    if (response.success) {
                        VXAdmin.showMessage(response.data.message, 'success');
                        location.reload();
                    } else {
                        VXAdmin.showMessage(response.data.message || 'An error occurred.', 'error');
                    }
                },
                error: function() {
                    VXAdmin.hideLoading();
                    VXAdmin.showMessage('An error occurred while processing the request.', 'error');
                }
            });
        },

        /**
         * Duplicate tour
         */
        duplicateTour: function(e) {
            e.preventDefault();
            const $button = $(this);
            const tourId = $button.data('tour-id');
            
            if (!tourId) {
                VXAdmin.showMessage('Invalid tour ID.', 'error');
                return;
            }
            
            $button.prop('disabled', true).text('Duplicating...');
            
            $.ajax({
                url: vxAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_duplicate_tour',
                    tour_id: tourId,
                    nonce: vxAdmin.nonce
                },
                success: function(response) {
                    if (response.success) {
                        VXAdmin.showMessage('Tour duplicated successfully!', 'success');
                        location.reload();
                    } else {
                        VXAdmin.showMessage(response.data.message || 'Failed to duplicate tour.', 'error');
                        $button.prop('disabled', false).text('Duplicate');
                    }
                },
                error: function() {
                    VXAdmin.showMessage('An error occurred while duplicating the tour.', 'error');
                    $button.prop('disabled', false).text('Duplicate');
                }
            });
        },

        /**
         * Export tour
         */
        exportTour: function(e) {
            e.preventDefault();
            const tourId = $(this).data('tour-id');
            
            if (!tourId) {
                VXAdmin.showMessage('Invalid tour ID.', 'error');
                return;
            }
            
            // Create download link
            const downloadUrl = vxAdmin.ajaxUrl + '?action=vx_export_tour&tour_id=' + tourId + '&nonce=' + vxAdmin.nonce;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'tour-' + tourId + '.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        /**
         * Delete tour
         */
        deleteTour: function(e) {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to permanently delete this tour? This action cannot be undone.')) {
                return;
            }
            
            const $button = $(this);
            const tourId = $button.data('tour-id');
            
            $button.prop('disabled', true).text('Deleting...');
            
            $.ajax({
                url: vxAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_delete_tour',
                    tour_id: tourId,
                    nonce: vxAdmin.nonce
                },
                success: function(response) {
                    if (response.success) {
                        VXAdmin.showMessage('Tour deleted successfully!', 'success');
                        $button.closest('tr').fadeOut();
                    } else {
                        VXAdmin.showMessage(response.data.message || 'Failed to delete tour.', 'error');
                        $button.prop('disabled', false).text('Delete');
                    }
                },
                error: function() {
                    VXAdmin.showMessage('An error occurred while deleting the tour.', 'error');
                    $button.prop('disabled', false).text('Delete');
                }
            });
        },

        /**
         * Handle import file selection
         */
        handleImportFile: function() {
            const file = this.files[0];
            const $preview = $('#vx-import-preview');
            
            if (!file) {
                $preview.hide();
                return;
            }
            
            // Validate file type
            if (file.type !== 'application/json') {
                VXAdmin.showMessage('Please select a valid JSON file.', 'error');
                $(this).val('');
                $preview.hide();
                return;
            }
            
            // Read and preview file
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    VXAdmin.showImportPreview(data);
                } catch (error) {
                    VXAdmin.showMessage('Invalid JSON file format.', 'error');
                    $('#vx-import-file').val('');
                    $preview.hide();
                }
            };
            reader.readAsText(file);
        },

        /**
         * Show import preview
         */
        showImportPreview: function(data) {
            const $preview = $('#vx-import-preview');
            const tourName = data.title || 'Untitled Tour';
            const sceneCount = data.scenes ? data.scenes.length : 0;
            
            $preview.html(`
                <h4>Import Preview</h4>
                <p><strong>Tour Name:</strong> ${tourName}</p>
                <p><strong>Scenes:</strong> ${sceneCount}</p>
                <button type="button" class="button button-primary vx-import-tour">Import Tour</button>
            `).show();
        },

        /**
         * Import tour
         */
        importTour: function(e) {
            e.preventDefault();
            const fileInput = document.getElementById('vx-import-file');
            const file = fileInput.files[0];
            
            if (!file) {
                VXAdmin.showMessage('Please select a file to import.', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('action', 'vx_import_tour');
            formData.append('import_file', file);
            formData.append('nonce', vxAdmin.nonce);
            
            $(this).prop('disabled', true).text('Importing...');
            VXAdmin.showLoading();
            
            $.ajax({
                url: vxAdmin.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    VXAdmin.hideLoading();
                    
                    if (response.success) {
                        VXAdmin.showMessage('Tour imported successfully!', 'success');
                        setTimeout(function() {
                            window.location.href = response.data.edit_url;
                        }, 1500);
                    } else {
                        VXAdmin.showMessage(response.data.message || 'Failed to import tour.', 'error');
                        $('.vx-import-tour').prop('disabled', false).text('Import Tour');
                    }
                },
                error: function() {
                    VXAdmin.hideLoading();
                    VXAdmin.showMessage('An error occurred while importing the tour.', 'error');
                    $('.vx-import-tour').prop('disabled', false).text('Import Tour');
                }
            });
        },

        /**
         * Dismiss notice
         */
        dismissNotice: function(e) {
            e.preventDefault();
            const $notice = $(this).closest('.notice');
            const noticeType = $(this).data('notice-type');
            
            $notice.fadeOut();
            
            // Save dismissal preference
            if (noticeType) {
                $.post(vxAdmin.ajaxUrl, {
                    action: 'vx_dismiss_notice',
                    notice_type: noticeType,
                    nonce: vxAdmin.nonce
                });
            }
        },

        /**
         * Show tooltip
         */
        showTooltip: function() {
            const $this = $(this);
            const tooltip = $this.attr('data-tooltip');
            
            if (tooltip) {
                const $tooltip = $('<div class="vx-tooltip">' + tooltip + '</div>');
                $('body').append($tooltip);
                
                const offset = $this.offset();
                $tooltip.css({
                    top: offset.top - $tooltip.outerHeight() - 5,
                    left: offset.left + ($this.outerWidth() / 2) - ($tooltip.outerWidth() / 2)
                }).fadeIn(200);
            }
        },

        /**
         * Hide tooltip
         */
        hideTooltip: function() {
            $('.vx-tooltip').fadeOut(200, function() {
                $(this).remove();
            });
        },

        /**
         * Show loading overlay
         */
        showLoading: function() {
            if (!$('#vx-loading-overlay').length) {
                $('body').append('<div id="vx-loading-overlay" class="vx-loading-overlay"><div class="vx-spinner"></div></div>');
            }
            $('#vx-loading-overlay').fadeIn();
        },

        /**
         * Hide loading overlay
         */
        hideLoading: function() {
            $('#vx-loading-overlay').fadeOut();
        },

        /**
         * Show message
         */
        showMessage: function(message, type = 'info') {
            const $message = $(`<div class="vx-message ${type}">${message}</div>`);
            
            // Remove existing messages
            $('.vx-message').remove();
            
            // Add new message
            if ($('.vx-admin-header').length) {
                $('.vx-admin-header').after($message);
            } else {
                $('.wrap h1').after($message);
            }
            
            // Auto-hide after 5 seconds
            setTimeout(function() {
                $message.fadeOut(function() {
                    $(this).remove();
                });
            }, 5000);
        },

        /**
         * Utility: Check if email is valid
         */
        isValidEmail: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        /**
         * Utility: Check if URL is valid
         */
        isValidUrl: function(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        VXAdmin.init();
    });

    // Make VXAdmin globally available
    window.VXAdmin = VXAdmin;

})(jQuery);