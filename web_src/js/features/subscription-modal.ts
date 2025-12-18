import $ from 'jquery';

export function initSubscriptionModal() {
  const modalButton = $('[data-modal="upgrade-subscription-modal"]');
  const modalHeader = modalButton.attr('data-modal-header');
  modalButton.on('click', (e) => {
    e.preventDefault();
    const targetModal = $('#upgrade-subscription-modal');
    targetModal.children('.header').text(modalHeader);
    targetModal.modal('show');
  });
}
