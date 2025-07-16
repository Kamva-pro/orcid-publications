jQuery(document).ready(function($) {
    const resultsDiv = $('#publicationsResults');
    const loadMoreBtn = $('#loadMoreBtn');
    const searchInput = $('#pubSearch');
    const yearFilter = $('#yearFilter');
    
    let allWorks = [];
    let currentIndex = 0;
    const pageSize = 10;
    let currentOrcidId = orcidPubVars.current_page;
    let isLoading = false;
    let currentSearch = '';
    let currentYear = '';
    
    // Auto-fetch on page load if we're on a relevant page
    if (currentOrcidId) {
        fetchPublications();
    } else {
        resultsDiv.html('');
    }

    if (orcidPubVars.current_researcher) {
        // Force fetch for the specific researcher
        currentOrcidId = 'specific';
        fetchResearcherPublications(orcidPubVars.current_researcher);
    } else if (currentOrcidId) {
        // Normal auto-load
        fetchPublications();
    }
    
    // New function to handle researcher-specific loading
    function fetchResearcherPublications(researcherSlug) {
        isLoading = true;
        showLoadingState();
        
        $.get({
            url: `${orcidPubVars.rest_url}/publications`,
            data: {
                researcher: researcherSlug,
                page: 1,
                limit: pageSize
            },
            success: function(response) {
                allWorks = response.data;
                displayWorks(allWorks);
                
                if (response.total > pageSize) {
                    loadMoreBtn.show();
                }
            },
            error: function(xhr, status, error) {
                showErrorState(error);
            },
            complete: function() {
                isLoading = false;
            }
        });
    }
    
    // Search handler
    searchInput.on('input', function() {
        currentSearch = $(this).val();
        currentIndex = 0;
        fetchPublications();
    });
    
    // Year filter handler
    yearFilter.on('change', function() {
        currentYear = $(this).val();
        currentIndex = 0;
        fetchPublications();
    });
    
    // Load more handler - prevent default form submission
    loadMoreBtn.on('click', function(e) {
        e.preventDefault();
        if (!isLoading) {
            fetchPublications(true); // true = is load more action
        }
    });
    
    function fetchPublications(isLoadMore = false) {
        // Don't proceed if we're already loading
        if (isLoading) return;
        
        isLoading = true;
        
        // Show loading state only on initial load or filter changes
        if (!isLoadMore) {
            showLoadingState();
        } else {
            // For "Load More", show loading on the button
            loadMoreBtn.prop('disabled', true)
                      .html('<i class="fas fa-spinner fa-spin"></i> Loading...');
        }
        
        const endpoint = currentOrcidId === 'all' 
            ? 'publications' 
            : `publications/${currentOrcidId}`;
            
        const params = {
            page: Math.floor(currentIndex / pageSize) + 1,
            limit: pageSize,
            search: currentSearch,
            year: currentYear
        };
        
        $.get({
            url: `${orcidPubVars.rest_url}/${endpoint}`,
            data: params,
            success: function(response) {
                if (!isLoadMore) {
                    // Initial load or filter changed - replace all works
                    allWorks = response.data;
                    resultsDiv.empty();
                } else {
                    // Append new works to existing ones
                    allWorks = [...allWorks, ...response.data];
                }
                
                // Display all works up to current index + pageSize
                displayWorks(allWorks.slice(0, currentIndex + pageSize));
                
                // Update pagination controls
                if (currentIndex + response.data.length < response.total) {
                    loadMoreBtn.show();
                } else {
                    loadMoreBtn.hide();
                }
                
                if (response.data.length === 0 && currentIndex === 0) {
                    showEmptyState();
                }
                
                // Increment index only after successful load
                if (isLoadMore) {
                    currentIndex += pageSize;
                }
            },
            error: function(xhr, status, error) {
                showErrorState(error);
                // Reset index if load more failed
                if (isLoadMore) {
                    currentIndex -= pageSize;
                }
            },
            complete: function() {
                isLoading = false;
                if (isLoadMore) {
                    loadMoreBtn.prop('disabled', false)
                               .html('<i class="fas fa-arrow-down"></i> Load More');
                }
            }
        });
    }
    
    function displayWorks(works) {
        if (works.length === 0) {
            showEmptyState();
            return;
        }
        
        // Clear only if it's not a load more action
        if (currentIndex === 0) {
            resultsDiv.empty();
        }
        
        works.forEach(work => {
            const workEntry = $(`
                <div class="work-entry">
                    <div class="date-col">
                        <div class="date">
                            <i class="far fa-calendar-alt"></i> ${work.date}
                        </div>
                    </div>
                    <div class="content-col">
                        <div class="title">${work.title}</div>
                        <div class="author">by ${work.author}</div>
                        ${work.url ? `
                            <a class="read-more" href="${work.url}" target="_blank" rel="noopener noreferrer">
                                View Publication <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                    </div>
                </div>
            `);
            resultsDiv.append(workEntry);
        });
    }
    
    function showLoadingState() {
        resultsDiv.html(`
            <div class="loading">
                <div class="spinner"></div>
                <h3>Loading Publications</h3>
                <p>Please wait while we fetch the latest research...</p>
            </div>
        `);
        loadMoreBtn.hide();
    }
    
    function showEmptyState() {
        resultsDiv.html(`
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No Publications Found</h3>
                <p>No publications match your current filters.</p>
            </div>
        `);
        loadMoreBtn.hide();
    }
    
    function showErrorState(error) {
        resultsDiv.html(`
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Publications</h3>
                <p>${error || 'An unknown error occurred'}</p>
                <p>Please try again later.</p>
            </div>
        `);
        loadMoreBtn.hide();
    }
});