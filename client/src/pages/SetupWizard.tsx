    if (currentStep === "welcome") {
      await updateStep.mutateAsync({ step: "service" });
      setCurrentStep("service");
    } else if (currentStep === "service") {
      // Validate service form
      if (!serviceName || !servicePrice) {
        toast.error("Vennligst fyll ut alle påkrevde felt");
        return;
      }

      try {
        await addService.mutateAsync({
          name: serviceName,
          duration: parseInt(serviceDuration),
          price: parseFloat(servicePrice),
          description: serviceDescription || undefined,
        });
        await updateStep.mutateAsync({ step: "employee" });
        setCurrentStep("employee");
        toast.success("Tjeneste lagt til!");
      } catch (error: any) {
        toast.error("Kunne ikke legge til tjeneste", {
          description: error.message,
        });
      }
    } else if (currentStep === "employee") {
      if (!skipEmployee) {
        // Validate employee form
        if (!employeeName) {
          toast.error("Vennligst fyll ut ansatt navn");
          return;
        }

        try {
          await addEmployee.mutateAsync({
            name: employeeName,
            email: employeeEmail || undefined,
            phone: employeePhone || undefined,
            commissionRate: parseFloat(employeeCommission),
          });
          toast.success("Ansatt lagt til!");
        } catch (error: any) {
          toast.error("Kunne ikke legge til ansatt", {
            description: error.message,
          });
          return;
        }
      }
      
      await updateStep.mutateAsync({ step: "hours" });
      setCurrentStep("hours");
    } else if (currentStep === "hours") {
      // Validate hours
      if (workDays.length === 0) {
        toast.error("Vennligst velg minst én arbeidsdag");
        return;
      }

      try {
        await setBusinessHours.mutateAsync({
          openTime,
          closeTime,
          workDays,
        });
        await completeWizard.mutateAsync();
        // Clear draft data after completion
        await saveDraft.mutateAsync({});
        setCurrentStep("complete");
        toast.success("Oppsettet er fullført!");
      } catch (error: any) {