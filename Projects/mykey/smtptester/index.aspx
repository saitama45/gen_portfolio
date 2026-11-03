<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<%@ Import Namespace="System.Net" %> 
<%@ Page Language="VB" %>
<%@ Import Namespace="System.Net.Mail" %>
<script runat="server"> 
		private Sub btnSend_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
		
        Dim strFrom = new MailAddress(txtFrom.Text) 
        Dim strTo = new MailAddress(txtTo.Text)
        Dim MailMsg As New MailMessage(strFrom, strTo)
        MailMsg.BodyEncoding = Encoding.Default
        MailMsg.Subject = "This is a test"
        MailMsg.Body = "<center><h2><b>Thank you for shopping with us!</b></h2></center><br/> Hi Name, <br/><br/> We received your order on Date. You will be kept up to date regarding the progress of your order. On the other hand please do feel free to contact us: 01202 00000. <br/><br/> Once again many thanks for choosing Bambang Medical and we wish you to enjoy shopping and hope to see you again real soon!"
        MailMsg.Priority = MailPriority.High
        MailMsg.IsBodyHtml = True
        Dim SmtpMail As New SmtpClient
        Dim basicAuthenticationInfo
        SmtpMail.Host = txtMailServer.Text
		Dim StrA As String = "gmail.com"
		Dim StrB As String = lcase(txtFrom.Text)
		Dim Stu As Boolean= InStr(StrB, StrA)
       
	   If Stu= True Then       
	    Try	
		
		SmtpMail.Port=587
        SmtpMail.DeliveryMethod = SmtpDeliveryMethod.Network
        SmtpMail.UseDefaultCredentials = False
        SmtpMail.Credentials = new System.Net.NetworkCredential(txtFrom.Text,txtPass.Text)
        SmtpMail.EnableSsl = true
        SmtpMail.Send(MailMsg)
		lblStatus.Text ="sent successfully"
	
     	Catch ex As Exception
		
		Response.Write (ex.Message)
		Response.Write ("<BR><BR>* Please double check the From Address and Password to confirm that both of them are correct. <br>")
		Response.Write ("<BR><BR>If you are using gmail smtp to send email for the first time, please refer to this KB to setup your gmail account: http://www.smarterasp.net/support/kb/a1546/send-email-from-gmail-with-smtp-authentication-but-got-5_5_1-authentication-required-error.aspx?KBSearchID=137388")
		Response.end

       Finally
	   End Try
		
		Else
		
		Try
		SmtpMail.Port=25
        SmtpMail.DeliveryMethod = SmtpDeliveryMethod.Network
        SmtpMail.UseDefaultCredentials = False
        SmtpMail.Credentials = new System.Net.NetworkCredential(txtFrom.Text,txtPass.Text)
        SmtpMail.EnableSsl = false
        SmtpMail.Send(MailMsg)
		lblStatus.Text ="sent successfully"       
        Catch ex As Exception
		Response.Write (ex.Message)
		Response.Write ("<BR><BR>* Please double check the user From Address and Password to confirm that both of them are correct. <br>")
		Response.end
		
		Finally
        End Try	
        End If		
    End Sub 
</script> 
<html>
<body>
<table align = center>
    <TR> <TD align = center colspan = 2><h3>Email From ASP.NET(vb)</h3></tr>
    <form id="MailForm" method="post" runat="server" target="_blank">
    <TR>    <TD><asp:Label ID="Label1" runat="server">From Email Address:   
        </asp:Label>
      
		<TD><asp:TextBox ID="txtFrom" runat="server"></asp:TextBox>        </TR>
		
		
		<TR>    <TD><asp:Label ID="lblPass" runat="server">Email Password:   
        </asp:Label>
      
		<TD><asp:TextBox ID="txtPass" runat="server" TextMode="Password" ></asp:TextBox>        </TR>
		
    
<TR>	<TD>	<asp:Label ID="EmailServer" runat="server">Email Server:  
        </asp:Label>
    
	<TD>	<asp:TextBox ID="txtMailServer" runat="server"></asp:TextBox>    
  <TD> <font color = blue>[For Example :: Mail.YourDomain.com] </font><font color=red>(make sure your domain resolves to our mail server.) </font>
   	</TR>	
 <TR>  <TD>     <asp:Label ID="Label2"  runat="server">Recipient Email Address: 

        </asp:Label>
    <TD>    <asp:TextBox ID="txtTo" runat="server"></asp:TextBox>					</TR>
        <TR><TD align = center><asp:Button ID="btnSend" runat="server"
            Text="Send" OnClick="btnSend_Click"></asp:Button>				</TR>
    <TR> <TD colspan = 2> <asp:Label ID="lblStatus" runat="server" forecolor=Green Font-Size="15" Bold = true> 
        </asp:Label>
    </form>
</body>
</html>
