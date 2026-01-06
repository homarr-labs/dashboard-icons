/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook to send email notification when a submission is updated.
 * Sends email to the submission creator when status changes.
 * 
 * Sources:
 * - https://pocketbase.io/docs/js-event-hooks/#onrecordupdaterequest
 * - https://pocketbase.io/docs/js-logging/
 * - https://pocketbase.io/docs/js-sending-emails/
 */
onRecordUpdate((e) => {
	const logger = e.app.logger().withGroup("submission_update_email");
	const record = e.record;
	const recordId = record.id;
	const submissionName = record.get("name");
	const newStatus = record.get("status");

	// 1. Fetch the old record from the database to compare status.
	//    We do this BEFORE e.next() because the DB still has the old data.
	let oldStatus = null;
	try {
		// Note: app.dao() is deprecated/removed in newer versions, use app.findRecordById directly.
		const oldRecord = e.app.findRecordById("submissions", recordId);
		oldStatus = oldRecord.get("status");
	} catch (err) {
		// It's possible the record doesn't exist or something else went wrong.
		// If we can't fetch the old status, we can't reliably determine if it changed.
		logger.warn("Could not fetch old record status", "id", recordId, "error", err);
	}

	// 2. Proceed with the update
	e.next();

	// 3. Post-update logic: Send email if status changed
	if (oldStatus && oldStatus !== newStatus) {
		logger.info("Submission status changed",
			"id", recordId,
			"old_status", oldStatus,
			"new_status", newStatus
		);

		const createdById = record.get("created_by");
		if (!createdById) {
			logger.warn("Submission has no created_by user", "id", recordId);
			return;
		}

		// Fetch the user to get the email. 
		// 'created_by' points to a 'users' (or auth) record.
		let userRecord;
		try {
			try {
				userRecord = e.app.findRecordById("users", createdById);
			} catch (err1) {
				// Fallback for other auth collections if needed, though usually it's 'users'
				logger.debug("User not found in 'users', trying '_pb_users_auth_'", "error", err1);
				userRecord = e.app.findRecordById("_pb_users_auth_", createdById);
			}
		} catch (err) {
			logger.error("Could not find user for submission", "created_by", createdById, "error", err);
			return;
		}

		const userEmail = userRecord.get("email");
		const userName = userRecord.get("username") || "User";

		if (!userEmail) {
			logger.warn("User has no email", "user_id", createdById);
			return;
		}

		// Fetch info about the person who updated it (if available in context, but hooks run server side)
		// Since we don't have direct access to the 'operator' in this hook easily without request context,
		// we'll check if 'approved_by' field was updated or exists on the record.
		let reviewerName = "The Dashboard Icons Team";
		const approvedById = record.get("approved_by");
		if (approvedById) {
			try {
				const reviewerRecord = e.app.findRecordById("users", approvedById);
				reviewerName = reviewerRecord.get("username") || reviewerRecord.get("email") || "Admin";
			} catch (_) {
				// If we can't find the reviewer, we'll just use the default
			}
		}

		// Prepare email content variables
		const adminComment = record.get("admin_comment") || "";
		const dashboardLink = "https://dashboardicons.com/dashboard";
		const submissionIdShort = recordId.substring(0, 8);

		// Styling constants
		const primaryColor = "#2563eb"; // Blue-600
		const successColor = "#16a34a"; // Green-600
		const errorColor = "#dc2626";   // Red-600
		const neutralColor = "#4b5563"; // Gray-600
		const lightBg = "#f3f4f6";      // Gray-100

		const buildAdminCommentSection = (accentColor, backgroundColor, title = "Admin Comment") => {
			if (!adminComment) return "";

			return `
                <div style="margin: 20px 0; padding: 15px; background-color: ${backgroundColor}; border-left: 4px solid ${accentColor}; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: ${accentColor}; font-size: 14px; text-transform: uppercase;">${title}</h3>
                    <p style="margin-bottom: 0; white-space: pre-wrap; color: #1f2937;">${adminComment}</p>
                </div>
            `;
		};

		// Email Template Helpers
		const header = `
            <div style="background-color: #111827; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-family: system-ui, -apple-system, sans-serif; font-size: 24px;">Dashboard Icons</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
        `;

		const footer = `
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
                    <p>Submission ID: <code>${recordId}</code> (Short: ${submissionIdShort})</p>
                    <p>
                        <a href="${dashboardLink}" style="color: ${primaryColor}; text-decoration: none;">Visit Dashboard</a> | 
                        <a href="https://dashboardicons.com" style="color: ${primaryColor}; text-decoration: none;">Home</a>
                    </p>
                    <p>&copy; ${new Date().getFullYear()} Dashboard Icons. All rights reserved.</p>
                </div>
            </div>
        `;

		let subject = "";
		let contentBody = "";

		// Construct email based on status
		if (newStatus === "approved") {
			subject = `dashboardicons - Submission approved: "${submissionName}"`;
			contentBody = `
                <h2 style="color: ${successColor}; margin-top: 0;">Congratulations!</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">Hello ${userName},</p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    🥳 Great news! Your icon submission "<strong>${submissionName}</strong>" has been approved by <strong>${reviewerName}</strong>.
                </p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    Thank you for your contribution to the icon collection. Your work helps make Dashboard Icons better for everyone.
                </p>
                ${buildAdminCommentSection(successColor, "#ecfdf3")}
                <div style="margin: 25px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: ${successColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in Dashboard</a>
                </div>
            `;
		} else if (newStatus === "rejected") {
			subject = `dashboardicons - Submission rejected: "${submissionName}"`;
			contentBody = `
                <h2 style="color: ${errorColor}; margin-top: 0;">Submission Rejected</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">Hello ${userName},</p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    We're sorry, but your icon submission "<strong>${submissionName}</strong>" has been rejected by <strong>${reviewerName}</strong>.
                </p>
                ${adminComment ? `
                <div style="margin: 20px 0; padding: 15px; background-color: #fef2f2; border-left: 4px solid ${errorColor}; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: ${errorColor}; font-size: 14px; text-transform: uppercase;">Reason for Rejection</h3>
                    <p style="margin-bottom: 0; white-space: pre-wrap; color: #7f1d1d;">${adminComment}</p>
                </div>
                ` : ""}
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    Don't be discouraged! You can review the feedback and submit a new version or try a different icon.
                </p>
                <div style="margin: 25px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: ${neutralColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Manage Submissions</a>
                </div>
            `;
		} else if (newStatus === "added_to_collection") {
			subject = `dashboardicons - Submission published: "${submissionName}"`;
			contentBody = `
                <h2 style="color: ${primaryColor}; margin-top: 0;">Icon Published!</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">Hello ${userName},</p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    🚀 Fantastic! Your icon "<strong>${submissionName}</strong>" has been added to the official collection.
                </p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    It is now available for the community to use and fully added to the collection. We appreciate your quality contribution.
                </p>
                ${buildAdminCommentSection(primaryColor, "#eff6ff")}
                <div style="margin: 25px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: ${primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">See Your Icon</a>
                </div>
            `;
		} else if (newStatus === "pending") {
			subject = `dashboardicons - Submission pending review: "${submissionName}"`;
			contentBody = `
                <h2 style="color: ${neutralColor}; margin-top: 0;">Submission Received</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">Hello ${userName},</p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    Your submission "<strong>${submissionName}</strong>" is now <strong>Pending Review</strong>.
                </p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    An admin will review your icon shortly to ensure it meets our quality standards. You will be notified once the review is complete.
                </p>
                <div style="margin: 25px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: ${neutralColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Status</a>
                </div>
            `;
		} else {
			// Generic update
			subject = `Update on submission "${submissionName}"`;
			contentBody = `
                <h2 style="color: ${neutralColor}; margin-top: 0;">Status Update</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">Hello ${userName},</p>
                <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                    Your submission "<strong>${submissionName}</strong>" status has changed to: <strong>${newStatus}</strong>.
                </p>
                ${adminComment ? `
                <div style="margin: 20px 0; padding: 15px; background-color: ${lightBg}; border-left: 4px solid ${neutralColor}; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: ${neutralColor}; font-size: 14px; text-transform: uppercase;">Admin Comment</h3>
                    <p style="margin-bottom: 0; white-space: pre-wrap; color: #1f2937;">${adminComment}</p>
                </div>
                ` : ""}
                <div style="margin: 25px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: ${neutralColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                </div>
            `;
		}

		const fullHtml = `${header}${contentBody}${footer}`;

		try {
			const message = new MailerMessage({
				from: {
					address: e.app.settings().meta.senderAddress || "noreply@example.com",
					name: e.app.settings().meta.senderName || "Dashboard Icons",
				},
				to: [{ address: userEmail }],
				subject: subject,
				html: fullHtml,
			});

			e.app.newMailClient().send(message);
			logger.info("Sent email notification", "to", userEmail, "submission_id", recordId);
		} catch (err) {
			logger.error("Failed to send email", "error", err);
		}
	}
}, "submissions");
