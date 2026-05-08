// Constants for statuses to match styling
const STATUS_COVERED = "Area Covered";
const STATUS_PARTIAL = "Partially Covered";
const STATUS_MORE_HELP = "Need More Help";
const STATUS_URGENT = "Urgent - Need Teams Now";

// Districts list
const DISTRICTS = ["Dhaka", "Chittagong", "Sylhet", "Khulna", "Rajshahi", "Barisal", "Rangpur", "Mymensingh"];

// Get reports from localStorage
function getReports() {
    const data = localStorage.getItem('floodAidReports');
    return data ? JSON.parse(data) : [];
}

// Save reports to localStorage
function saveReport(report) {
    const reports = getReports();
    reports.unshift(report); // Add to the beginning of the array so newest is first
    localStorage.setItem('floodAidReports', JSON.stringify(reports));
}

// Map status to CSS classes
function getStatusClasses(status) {
    switch(status) {
        case STATUS_COVERED:
            return { border: 'status-green', bg: 'bg-green' };
        case STATUS_PARTIAL:
            return { border: 'status-yellow', bg: 'bg-yellow' };
        case STATUS_MORE_HELP:
            return { border: 'status-orange', bg: 'bg-orange' };
        case STATUS_URGENT:
            return { border: 'status-red', bg: 'bg-red' };
        default:
            return { border: '', bg: '' };
    }
}

// Map status to Map Grid box classes
function getMapStatusClass(status) {
    switch(status) {
        case STATUS_COVERED: return 'district-green';
        case STATUS_PARTIAL: return 'district-yellow';
        case STATUS_MORE_HELP: return 'district-orange';
        case STATUS_URGENT: return 'district-red';
        default: return '';
    }
}

// Create HTML string for a report card
function createReportCard(report) {
    const classes = getStatusClasses(report.status);
    const date = new Date(report.timestamp);
    const timeString = date.toLocaleString();

    return `
        <div class="card ${classes.border}">
            <div class="card-header">
                <div>
                    <div class="card-team">${report.teamName}</div>
                    <div class="card-location">📍 ${report.location}</div>
                </div>
                <div>
                    <span class="card-status ${classes.bg}">${report.status}</span>
                </div>
            </div>
            <div class="card-body">
                <p>${report.message}</p>
            </div>
            <div class="card-time" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <div>
                    <a href="report.html?editId=${report.timestamp}" style="color: #0056b3; text-decoration: none; font-size: 0.9rem; font-weight: 600; margin-right: 1rem;">Edit Update</a>
                    <a href="#" onclick="deleteReport('${report.timestamp}'); return false;" style="color: #F44336; text-decoration: none; font-size: 0.9rem; font-weight: 600;">Delete</a>
                </div>
                <span style="color: #999; font-size: 0.8rem;">Posted: ${timeString}</span>
            </div>
        </div>
    `;
}

// Render feed on Home Page
function renderFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return; // Not on the home page

    const reports = getReports();
    
    if (reports.length === 0) {
        feedContainer.innerHTML = '<p>No reports submitted yet. Be the first to post an update!</p>';
        return;
    }

    // Map through array and join the resulting HTML strings
    feedContainer.innerHTML = reports.map(createReportCard).join('');
}

// Handle Form Submission on Report Page
function setupReportForm() {
    const form = document.getElementById('report-form');
    if (!form) return; // Not on the report page

    // Check if we are in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId');
    let isEditMode = false;

    if (editId) {
        const reports = getReports();
        const reportToEdit = reports.find(r => r.timestamp === editId);
        
        if (reportToEdit) {
            isEditMode = true;
            document.getElementById('teamName').value = reportToEdit.teamName;
            document.getElementById('location').value = reportToEdit.location;
            document.getElementById('status').value = reportToEdit.status;
            document.getElementById('message').value = reportToEdit.message;
            
            document.querySelector('#report-form button[type="submit"]').textContent = 'Update Report';
            document.querySelector('.section-title').textContent = 'Update Relief Report';
        }
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent page refresh

        // Grab values from inputs
        const teamName = document.getElementById('teamName').value;
        const location = document.getElementById('location').value;
        const status = document.getElementById('status').value;
        const message = document.getElementById('message').value;

        if (isEditMode) {
            // Update existing record
            let reports = getReports();
            const index = reports.findIndex(r => r.timestamp === editId);
            if (index !== -1) {
                reports[index] = {
                    teamName,
                    location,
                    status,
                    message,
                    timestamp: editId // Keep original timestamp as ID
                };
                localStorage.setItem('floodAidReports', JSON.stringify(reports));
            }
            
            const successMsg = document.getElementById('success-message');
            successMsg.textContent = 'Report updated successfully!';
            successMsg.style.display = 'block';
            
            // Redirect back to home after brief delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } else {
            // Create new report object
            const newReport = {
                teamName,
                location,
                status,
                message,
                timestamp: new Date().toISOString()
            };

            // Save and show success
            saveReport(newReport);
            
            const successMsg = document.getElementById('success-message');
            successMsg.textContent = 'Report submitted successfully!';
            successMsg.style.display = 'block';

            // Clear form
            form.reset();

            // Hide success message after 3 seconds
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 3000);
        }
    });
}

// Setup Map Grid on Map Page
function setupMapGrid() {
    const gridContainer = document.getElementById('map-grid');
    if (!gridContainer) return; // Not on map page

    const reports = getReports();
    const districtLatestStatus = {};
    
    // Find latest status for each district
    // Since reports are sorted newest first, the first one we find is the latest
    for (const district of DISTRICTS) {
        const latestReport = reports.find(r => r.location.toLowerCase().includes(district.toLowerCase()));
        if (latestReport) {
            districtLatestStatus[district] = latestReport.status;
        } else {
            districtLatestStatus[district] = null;
        }
    }

    // Render district boxes
    let gridHTML = '';
    for (const district of DISTRICTS) {
        const status = districtLatestStatus[district];
        const statusClass = status ? getMapStatusClass(status) : '';
        
        gridHTML += `
            <div class="district-box ${statusClass}" onclick="showDistrictReports('${district}')">
                <h3>${district}</h3>
                <p>${status ? status : 'No Reports'}</p>
            </div>
        `;
    }
    gridContainer.innerHTML = gridHTML;
}

// Show reports for a specific district when clicked on Map Page
function showDistrictReports(district) {
    const container = document.getElementById('district-reports');
    const title = document.getElementById('district-title');
    const feed = document.getElementById('district-feed');
    
    container.style.display = 'block';
    title.textContent = `Reports for ${district}`;
    
    const reports = getReports();
    // Filter reports that include the district name in location (case insensitive)
    const filtered = reports.filter(r => r.location.toLowerCase().includes(district.toLowerCase()));
    
    if (filtered.length === 0) {
        feed.innerHTML = '<p>No reports found for this district.</p>';
    } else {
        feed.innerHTML = filtered.map(createReportCard).join('');
    }
    
    // Scroll smoothly to the reports section
    container.scrollIntoView({ behavior: 'smooth' });
}

// Delete a report
function deleteReport(timestamp) {
    if (confirm("Are you sure you want to delete this report?")) {
        let reports = getReports();
        reports = reports.filter(r => r.timestamp !== timestamp);
        localStorage.setItem('floodAidReports', JSON.stringify(reports));
        
        // Re-render feed if we are on the home page
        renderFeed();
        
        // Re-render map grid and clear specific district view if on map page
        setupMapGrid();
        const container = document.getElementById('district-reports');
        if (container) {
            container.style.display = 'none';
        }
    }
}

// Initialize the appropriate functionality when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderFeed();
    setupReportForm();
    setupMapGrid();
});
