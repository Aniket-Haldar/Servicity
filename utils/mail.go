package utils

import (
	"fmt"
	"net/smtp"

	"github.com/Aniket-Haldar/Servicity/config"
)

func SendProviderStatusEmail(email, name, status, reason string) error {
	emailConfig := config.LoadEmailConfig()

	if emailConfig.SMTPHost == "" || emailConfig.SMTPPort == "" ||
		emailConfig.SMTPUser == "" || emailConfig.SMTPPassword == "" {
		return fmt.Errorf("email configuration missing in environment variables")
	}

	var subject, body string

	if status == "Approved" {
		subject = fmt.Sprintf("🎉 Your %s Provider Application has been Approved!", emailConfig.AppName)
		body = fmt.Sprintf(`Dear %s,

Congratulations! Your provider application has been approved.

You can now:
• Access your provider dashboard
• Create and manage your services
• Accept bookings from customers

Log in to your account to get started: %s

Welcome to the %s family!

Best regards,
The %s Team`, name, emailConfig.AppURL, emailConfig.AppName, emailConfig.AppName)
	} else {
		subject = fmt.Sprintf("%s Provider Application - Update Required", emailConfig.AppName)
		reasonText := ""
		if reason != "" {
			reasonText = fmt.Sprintf("\n\nReason: %s", reason)
		}
		body = fmt.Sprintf(`Dear %s,

Thank you for your interest in becoming a provider on %s.

We have reviewed your application and unfortunately cannot approve it at this time.%s

Don't worry! You can submit a new application after addressing the concerns mentioned above.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The %s Team`, name, emailConfig.AppName, reasonText, emailConfig.AppName)
	}

	msg := []byte(fmt.Sprintf(`From: %s
To: %s
Subject: %s
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

%s`, emailConfig.SMTPUser, email, subject, body))

	auth := smtp.PlainAuth("", emailConfig.SMTPUser, emailConfig.SMTPPassword, emailConfig.SMTPHost)
	return smtp.SendMail(emailConfig.SMTPHost+":"+emailConfig.SMTPPort, auth, emailConfig.SMTPUser, []string{email}, msg)
}
