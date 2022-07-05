import nodemailer from "nodemailer";

// async..await is not allowed in global scope, must use a wrapper
export async function sendEmail(to: string, html: string) {
  let transporter = nodemailer.createTransport({
    service: "hotmail",
    auth: {
      user: "oneappplus@outlook.com",
      pass: "$=RB9Nw7cLG;r)_",
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"VSG mail" <oneappplus@outlook.com>',
    to: to,
    subject: "VSG - Forgot password",
    html,
  });

  console.log("Message sent: %s", info.messageId);

  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
