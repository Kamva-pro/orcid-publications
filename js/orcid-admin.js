jQuery(document).ready(function($) {
    let rowCount = 1;
    
    // Add new researcher row
    $(document).on('click', '.add-researcher', function() {
        const newRow = `
        <tr>
            <td>
                <input type="text" name="orcid_publications_researchers[new][${rowCount}][id]" 
                       value="" class="regular-text" placeholder="0000-0000-0000-0000">
            </td>
            <td>
                <input type="text" name="orcid_publications_researchers[new][${rowCount}][name]" 
                       value="" class="regular-text" placeholder="Full Name">
            </td>
            <td>
                <input type="text" name="orcid_publications_researchers[new][${rowCount}][url_segment]" 
                       value="" class="regular-text" placeholder="URL segment">
            </td>
            <td>
                <button type="button" class="button button-secondary remove-researcher">Remove</button>
            </td>
        </tr>
        `;
        
        $(this).closest('tr').before(newRow);
        rowCount++;
    });
    
    // Remove researcher row
    $(document).on('click', '.remove-researcher', function() {
        $(this).closest('tr').remove();
    });
});